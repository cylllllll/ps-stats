export interface TrophyCounts {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

export interface PlayStationProfile {
  accountId: string;
  onlineId: string;
  avatarUrl: string;
  aboutMe?: string;
  isPlus?: boolean;
}

export interface PSNTrophyTitle {
  npCommunicationId: string;
  trophyTitleName: string;
  trophyTitleIconUrl?: string;
  trophyTitlePlatform?: string;
  progress?: number;
  definedTrophies?: Partial<TrophyCounts>;
  earnedTrophies?: Partial<TrophyCounts>;
  lastUpdatedDateTime?: string;
  hiddenFlag?: boolean;
}

export interface PSNPlayedConcept {
  id?: string | number;
  titleIds?: string[];
  name?: string;
  localizedName?: {
    metadata?: Record<string, unknown>;
  };
  media?: {
    images?: Array<{
      url?: string;
      type?: string;
      format?: string;
    }>;
  };
}

export interface PSNPlayedTitle {
  titleId: string;
  concept?: PSNPlayedConcept;
  name?: string;
  localizedName?: string;
  imageUrl?: string;
  localizedImageUrl?: string;
  category?: string;
  service?: string;
  playCount?: number | string;
  playDuration?: string;
  firstPlayedDateTime?: string;
  lastPlayedDateTime?: string;
}

export interface PSNPage<T> {
  items: T[];
  nextOffset?: number;
  totalItemCount?: number;
}

/**
 * The normalized game record used by every client-side analysis page.
 * All values come from PlayStation Network user/trophy APIs.
 */
export interface PlayStationGame {
  id: string;
  /** PSN trophy-group communication ID, kept separate from the play-history ID. */
  trophyTitleId?: string;
  /** PSN concept ID shared by regional and cross-generation product records. */
  gameFamilyId?: string;
  titleId?: string;
  name: string;
  iconUrl: string;
  platform: string;
  service?: string;
  playCount: number;
  playtimeSeconds: number;
  firstPlayedAt: number;
  lastPlayedAt: number;
  lastTrophyAt: number;
  trophyProgress: number;
  definedTrophies: TrophyCounts;
  earnedTrophies: TrophyCounts;
  hidden: boolean;
}

export interface PlayStationGamesResponse {
  psnId: string;
  profile: PlayStationProfile;
  games: PlayStationGame[];
  fetchedAt: string;
}

export function emptyTrophyCounts(): TrophyCounts {
  return { bronze: 0, silver: 0, gold: 0, platinum: 0 };
}

export function totalTrophies(counts: TrophyCounts): number {
  return counts.bronze + counts.silver + counts.gold + counts.platinum;
}
