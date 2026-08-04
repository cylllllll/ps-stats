"use client";

import { create } from "zustand";
import type {
  PSNPage,
  PSNPlayedTitle,
  PSNTrophyTitle,
  PlayStationGame,
  PlayStationProfile,
} from "@/app/types/playstation";
import { normalizePlayStationGames } from "@/lib/psn-normalize";
import {
  getCachedGames,
  getCacheInfo,
  setCachedGames,
} from "@/lib/cache";

const PAGE_SIZE = 200;
const MAX_PAGE_COUNT = 100;

interface ProfileResponse {
  accountId: string;
  profile: PlayStationProfile;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Unable to load PSN data.");
  }

  return data;
}

async function fetchAllPages<T>(
  endpoint: string,
  accountId: string,
  tolerateFailure = false
): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGE_COUNT; page += 1) {
    try {
      const data = await fetchJson<PSNPage<T>>(
        `${endpoint}?accountId=${encodeURIComponent(accountId)}&offset=${offset}&limit=${PAGE_SIZE}`
      );

      if (!Array.isArray(data.items)) {
        throw new Error("The PSN page response did not contain an item list.");
      }

      items.push(...data.items);

      const nextOffset = data.nextOffset;
      if (
        data.items.length === 0 ||
        nextOffset === undefined ||
        nextOffset <= offset ||
        (data.totalItemCount !== undefined &&
          items.length >= data.totalItemCount)
      ) {
        break;
      }

      offset = nextOffset;
    } catch (error) {
      if (tolerateFailure) {
        console.warn(`[Store] Unable to read ${endpoint}:`, error);
        return items;
      }
      throw error;
    }
  }

  return items;
}

interface GamesState {
  games: PlayStationGame[];
  profile: PlayStationProfile | null;
  psnId: string | null;
  gamesLoading: boolean;
  gamesRefreshing: boolean;
  gamesFromCache: boolean;
  gamesCacheAge: number | null;
  gamesError: string | null;

  setPsnId: (psnId: string) => void;
  fetchGames: (forceRefresh?: boolean) => Promise<void>;
  initializeData: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  games: [],
  profile: null,
  psnId: null,
  gamesLoading: true,
  gamesRefreshing: false,
  gamesFromCache: false,
  gamesCacheAge: null,
  gamesError: null,
} satisfies Omit<
  GamesState,
  "setPsnId" | "fetchGames" | "initializeData" | "reset"
>;

export const useGamesStore = create<GamesState>((set, get) => ({
  ...initialState,

  setPsnId: (psnId: string) => {
    const normalized = psnId.trim();
    if (!normalized || normalized === get().psnId) return;

    set({
      ...initialState,
      psnId: normalized,
    });
  },

  fetchGames: async (forceRefresh = false) => {
    const psnId = get().psnId;
    if (!psnId) return;

    if (forceRefresh) {
      set({ gamesRefreshing: true, gamesError: null });
    }

    if (!forceRefresh) {
      const cached = await getCachedGames(psnId);
      if (cached && get().psnId === psnId) {
        const info = await getCacheInfo(psnId);
        set({
          games: cached.games,
          profile: cached.profile,
          gamesFromCache: true,
          gamesCacheAge: info.age,
          gamesLoading: false,
          gamesRefreshing: false,
          gamesError: null,
        });
        return;
      }
    }

    try {
      const profile = await fetchJson<ProfileResponse>(
        `/api/psn/profile?psnId=${encodeURIComponent(psnId)}`
      );

      const [trophyTitles, playedTitles] = await Promise.all([
        fetchAllPages<PSNTrophyTitle>("/api/psn/titles", profile.accountId),
        fetchAllPages<PSNPlayedTitle>(
          "/api/psn/played",
          profile.accountId,
          true
        ),
      ]);
      const data = normalizePlayStationGames(
        psnId,
        profile.profile,
        trophyTitles,
        playedTitles
      );

      if (get().psnId !== psnId) return;
      await setCachedGames(psnId, data.games, data.profile);
      set({
        games: data.games,
        profile: data.profile,
        gamesFromCache: false,
        gamesCacheAge: null,
        gamesLoading: false,
        gamesRefreshing: false,
        gamesError: null,
      });
    } catch (error) {
      console.error("[Store] Failed to fetch PSN games:", error);
      if (get().psnId === psnId) {
        set({
          gamesLoading: false,
          gamesRefreshing: false,
          gamesError:
            error instanceof Error
              ? error.message
              : "Unable to load this PSN profile.",
        });
      }
    }
  },

  initializeData: async () => {
    if (!get().psnId || !get().gamesLoading) return;
    await get().fetchGames();
  },

  reset: () => {
    set(initialState);
  },
}));
