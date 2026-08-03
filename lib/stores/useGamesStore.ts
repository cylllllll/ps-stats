"use client";

import { create } from "zustand";
import type {
  PlayStationGame,
  PlayStationProfile,
} from "@/app/types/playstation";
import {
  getCachedGames,
  getCacheInfo,
  setCachedGames,
} from "@/lib/cache";

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
      const response = await fetch(
        `/api/psn/games?psnId=${encodeURIComponent(psnId)}`
      );
      const data = (await response.json()) as {
        error?: string;
        games?: PlayStationGame[];
        profile?: PlayStationProfile;
      };

      if (!response.ok) {
        throw new Error(data.error || "Unable to load this PSN profile.");
      }
      if (!data.games || !data.profile) {
        throw new Error("The PSN response did not contain a game library.");
      }

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
