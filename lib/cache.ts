import Dexie, { type EntityTable } from "dexie";
import type { PlayStationGame, PlayStationProfile } from "@/app/types/playstation";

interface GamesCache {
  psnId: string;
  games: PlayStationGame[];
  profile: PlayStationProfile;
  cacheVersion: number;
  timestamp: number;
}

const GAMES_CACHE_DURATION = 1000 * 60 * 30;
const GAMES_CACHE_VERSION = 12;

const db = new Dexie("PlayStationStatsDB") as Dexie & {
  games: EntityTable<GamesCache, "psnId">;
};

db.version(1).stores({
  games: "psnId",
  personality: "psnId",
});

// Remove the old AI personality cache when an existing browser database is upgraded.
db.version(2).stores({
  games: "psnId",
  personality: null,
});

export interface CachedGames {
  games: PlayStationGame[];
  profile: PlayStationProfile;
}

export async function getCachedGames(psnId: string): Promise<CachedGames | null> {
  try {
    const cached = await db.games.get(psnId);
    if (!cached) return null;

    if (cached.cacheVersion !== GAMES_CACHE_VERSION) {
      await db.games.delete(psnId);
      return null;
    }

    if (Date.now() - cached.timestamp > GAMES_CACHE_DURATION) {
      await db.games.delete(psnId);
      return null;
    }

    return { games: cached.games, profile: cached.profile };
  } catch (error) {
    console.error("Error reading PSN games from cache:", error);
    return null;
  }
}

export async function setCachedGames(
  psnId: string,
  games: PlayStationGame[],
  profile: PlayStationProfile
): Promise<void> {
  try {
    await db.games.put({
      psnId,
      games,
      profile,
      cacheVersion: GAMES_CACHE_VERSION,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error writing PSN games to cache:", error);
  }
}

export async function getCacheInfo(
  psnId: string
): Promise<{ cached: boolean; age: number | null }> {
  try {
    const cached = await db.games.get(psnId);
    return cached
      ? { cached: true, age: Date.now() - cached.timestamp }
      : { cached: false, age: null };
  } catch {
    return { cached: false, age: null };
  }
}

export async function clearCache(psnId?: string): Promise<void> {
  try {
    if (psnId) {
      await db.games.delete(psnId);
    } else {
      await db.games.clear();
    }
  } catch (error) {
    console.error("Error clearing PSN cache:", error);
  }
}
