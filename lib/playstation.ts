import type { PlayStationGame } from "@/app/types/playstation";

export function isPlayed(game: PlayStationGame): boolean {
  return (
    game.playCount > 0 ||
    game.playtimeSeconds > 0 ||
    game.lastPlayedAt > 0 ||
    game.lastTrophyAt > 0 ||
    game.trophyProgress > 0
  );
}

export function isPlayedInYear(
  game: PlayStationGame,
  year = new Date().getFullYear()
): boolean {
  const playedAt = game.lastPlayedAt || game.firstPlayedAt;
  if (!playedAt) return false;
  return new Date(playedAt * 1000).getFullYear() === year;
}

export function hasTrophyData(game: PlayStationGame): boolean {
  return Object.values(game.definedTrophies).some((count) => count > 0);
}

function normalizedFamilyName(name: string): string {
  return name
    .replace(/[®™©]/g, " ")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function gameFamilyKey(game: PlayStationGame): string {
  return game.gameFamilyId
    ? `concept:${game.gameFamilyId}`
    : `name:${normalizedFamilyName(game.name)}`;
}

export function hasCompletedFamilyVersion(
  game: PlayStationGame,
  games: PlayStationGame[]
): boolean {
  if (!hasTrophyData(game) || game.trophyProgress >= 100) return false;
  const familyKey = gameFamilyKey(game);
  return games.some(
    (candidate) =>
      candidate !== game &&
      hasTrophyData(candidate) &&
      candidate.trophyProgress >= 100 &&
      gameFamilyKey(candidate) === familyKey
  );
}

export function incompleteTrophyGames(
  games: PlayStationGame[]
): PlayStationGame[] {
  return games.filter(
    (game) =>
      hasTrophyData(game) &&
      game.trophyProgress < 100 &&
      !hasCompletedFamilyVersion(game, games)
  );
}

export function activityTimestamp(game: PlayStationGame): number {
  return Math.max(game.lastPlayedAt, game.lastTrophyAt);
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "暂无时长";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return "—";
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function platformLabel(platform: string): string {
  return platform
    .replace("ps5_native_game", "PS5")
    .replace("ps4_game", "PS4")
    .replace("ps3_game", "PS3")
    .replace("psvita_game", "PS Vita")
    .replace("pspc_game", "PC")
    .replace(/_/g, " ");
}

export const PLATFORM_DISTRIBUTION_ORDER = [
  "PS5",
  "PS4",
  "PS3",
  "App",
] as const;

export type PlatformDistributionLabel =
  (typeof PLATFORM_DISTRIBUTION_ORDER)[number];

/**
 * Collapse the different platform values returned by PSN into the
 * groups used by the charts page. PC is categorized under PS5.
 */
export function platformDistributionLabel(
  platform: string
): PlatformDistributionLabel | null {
  const normalized = platform
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s,_/-]+/g, "");

  if (!normalized) return null;
  if (
    normalized.includes("mediaapp") ||
    normalized === "app" ||
    normalized.includes("application")
  ) {
    return "App";
  }
  if (
    normalized.includes("ps5") ||
    normalized.includes("pspc") ||
    normalized.includes("pc")
  ) {
    return "PS5";
  }
  if (normalized.includes("ps4")) return "PS4";
  if (normalized.includes("ps3")) return "PS3";

  return null;
}

const PS4_PLATFORM_PATTERN = /(?:^|[,/\s])ps4(?:$|[,/_\s])/i;

export function isPS4Platform(platform: string): boolean {
  return PS4_PLATFORM_PATTERN.test(platform);
}

export function gameCoverObjectFit(platform: string): "object-contain" | "object-cover" {
  return isPS4Platform(platform) ? "object-contain" : "object-cover";
}

export function gameCoverAspectClass(platform: string): "aspect-auto" | "aspect-square" {
  return isPS4Platform(platform) ? "aspect-auto" : "aspect-square";
}

export function gameCoverImageHeightClass(platform: string): "h-auto" | "h-full" {
  return isPS4Platform(platform) ? "h-auto" : "h-full";
}

export function gameCoverFixedHeightClass(
  platform: string,
  squareHeight: "h-10" | "h-12" | "h-20"
): "h-auto" | "h-10" | "h-12" | "h-20" {
  return isPS4Platform(platform) ? "h-auto" : squareHeight;
}
