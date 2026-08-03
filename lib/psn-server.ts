import {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  getProfileFromAccountId,
  getUserPlayedGames,
  getUserTitles,
  makeUniversalSearch,
} from "psn-api";
import {
  emptyTrophyCounts,
  type PlayStationGame,
  type PlayStationProfile,
  type TrophyCounts,
} from "@/app/types/playstation";

interface CachedAuthorization {
  accessToken: string;
  expiresAt: number;
}

let cachedAuthorization: CachedAuthorization | null = null;

async function getAuthorization() {
  const npsso = process.env.PSN_NPSSO?.trim();
  if (!npsso) {
    throw new Error(
      "PSN_NPSSO is not configured. Add the NPSSO token from your PlayStation account to the server environment."
    );
  }

  if (
    cachedAuthorization &&
    cachedAuthorization.expiresAt > Date.now() + 60_000
  ) {
    return { accessToken: cachedAuthorization.accessToken };
  }

  const accessCode = await exchangeNpssoForAccessCode(npsso);
  const tokens = await exchangeAccessCodeForAuthTokens(accessCode);
  const expiresIn = Number(tokens.expiresIn) || 3600;

  cachedAuthorization = {
    accessToken: tokens.accessToken,
    expiresAt: Date.now() + Math.max(expiresIn - 60, 60) * 1000,
  };

  return { accessToken: tokens.accessToken };
}

function normalizeName(name: string): string {
  return name
    .replace(/[®™©]/g, " ")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\b(?:iii|ii|iv)\b/g, (value) => {
      if (value === "iii") return "3";
      if (value === "ii") return "2";
      return "4";
    })
    .replace(/\bps[45]\b(?:\s*&\s*\bps[45]\b)?/gi, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// PSN sometimes uses a product/catalog name in play history and a different
// edition or localized name for the corresponding trophy set. Keep these
// aliases narrow so the fallback matcher cannot join similarly named games.
const TITLE_NAME_VARIANTS = [
  ["Neverness to Everness", "NTE: Neverness to Everness"],
  [
    "Vampire Crawlers",
    "Vampire Crawlers: The Turbo Wildcard from Vampire Survivors",
  ],
  ["Skyrim", "The Elder Scrolls V: Skyrim Special Edition"],
  [
    "Teenage Mutant Ninja Turtles Cowabunga Collection",
    "Teenage Mutant Ninja Turtles: The Cowabunga Collection",
  ],
  ["Deeeer Simulator", "Deeeer Simulator: Your Average Everyday Deer Game"],
  ["Sea of Stars", "Sea of Stars: Sunset Edition"],
  ["Devil May Cry 5 Special Edition", "Devil May Cry 5 Series"],
  ["Control Ultimate Edition", "Control"],
  ["Legendary Edition: Mass Effect", "Mass Effect Legendary Edition"],
  ["Dragon's Crown", "Dragon's Crown Pro"],
  ["Dreams Universe", "Dreams"],
  ["Persona 5 Strikers", "Persona 5 Scramble: The Phantom Strikers"],
  ["女神異聞錄５ 亂戰：魅影攻手", "Persona 5 Scramble: The Phantom Strikers"],
  ["女神異聞錄５", "Persona 5"],
  ["明末：渊虚之羽", "明末：淵虛之羽", "WUCHANG: Fallen Feathers"],
  ["Crash Bandicoot: Warped", "Crash Bandicoot N. Sane Trilogy"],
  ["Marvel's Spider-Man Remastered", "Marvel's Spider-Man"],
  ["The Last of Us Part II Remastered", "The Last of Us Part II"],
].map((variants) => variants.map(normalizeName));

const TITLE_NAME_VARIANT_LOOKUP = new Map<string, string>();
for (const variants of TITLE_NAME_VARIANTS) {
  const canonicalName = variants[0];
  for (const variant of variants) {
    TITLE_NAME_VARIANT_LOOKUP.set(variant, canonicalName);
  }
}

function canonicalName(name: string): string {
  const normalized = normalizeName(name).replace(/\btrophies\b$/g, "").trim();
  return TITLE_NAME_VARIANT_LOOKUP.get(normalized) || normalized;
}

type TrophyTitle = Awaited<ReturnType<typeof getUserTitles>>["trophyTitles"][number];
type PlayedTitle = Awaited<ReturnType<typeof getUserPlayedGames>>["titles"][number];
type PlatformFamily = "PS4" | "PS5" | null;

// PSN exposes the Director's Cut under regional PPSA0196x/PPSA01971 IDs,
// while its play-history name is still returned as "DEATH STRANDING™". The
// related PPSA02627 record is bonus content, not another trophy set.
const DEATH_STRANDING_DIRECTORS_CUT_NAME = "death stranding director s cut";
const DEATH_STRANDING_DIRECTORS_CUT_TITLE_IDS = new Set([
  "PPSA01968_00",
  "PPSA01969_00",
  "PPSA01970_00",
  "PPSA01971_00",
]);
const DEATH_STRANDING_DIRECTORS_CUT_RELATED_IDS = new Set([
  ...DEATH_STRANDING_DIRECTORS_CUT_TITLE_IDS,
  "PPSA02627_00",
]);

function platformFamily(platform?: string): PlatformFamily {
  const value = String(platform || "").toLocaleUpperCase();
  if (value.includes("PS5")) return "PS5";
  if (value.includes("PS4")) return "PS4";
  return null;
}

function playedPlatform(played: PlayedTitle): PlatformFamily {
  return platformFamily(played.category) || platformFamily(played.titleId);
}

function platformsMatch(title: TrophyTitle, played: PlayedTitle): boolean {
  const titlePlatform = platformFamily(title.trophyTitlePlatform);
  const gamePlatform = playedPlatform(played);
  return !titlePlatform || !gamePlatform || titlePlatform === gamePlatform;
}

function titleIdsMatch(title: TrophyTitle, played: PlayedTitle): boolean {
  return (
    title.npCommunicationId === played.titleId ||
    played.concept?.titleIds?.includes(title.npCommunicationId) === true
  );
}

function playedNameCandidates(played: PlayedTitle): string[] {
  // The play-history model exposes the default concept name, while the live
  // PSN response can also include localized concept names that are not yet
  // declared by psn-api's TypeScript model. Trophy titles often use one of
  // these localized names, so include all of them before fuzzy matching.
  const concept = played.concept as
    | (PlayedTitle["concept"] & {
        localizedName?: { metadata?: Record<string, unknown> };
      })
    | undefined;
  const localizedNames = Object.values(concept?.localizedName?.metadata || {});

  return [played.name, played.localizedName, concept?.name, ...localizedNames].filter(
    (name): name is string => typeof name === "string" && name.trim().length > 0
  );
}

function isDeathStrandingDirectorsCutTitle(title: TrophyTitle): boolean {
  return normalizeName(title.trophyTitleName) === DEATH_STRANDING_DIRECTORS_CUT_NAME;
}

function isDeathStrandingDirectorsCutPlayed(played: PlayedTitle): boolean {
  return DEATH_STRANDING_DIRECTORS_CUT_TITLE_IDS.has(played.titleId);
}

function isMediaApp(played: PlayedTitle): boolean {
  return String(played.category || "").toLocaleLowerCase().includes("media_app");
}

function nameMatchScoreForNames(titleName: string, playedName: string): number {
  if (!titleName || !playedName) return 0;
  if (titleName === playedName) return 1;

  const titleTokens = new Set(titleName.split(" ").filter(Boolean));
  const playedTokens = new Set(playedName.split(" ").filter(Boolean));
  const sharedTokens = [...titleTokens].filter((token) =>
    playedTokens.has(token)
  );
  const shorterTokens =
    titleTokens.size <= playedTokens.size ? titleTokens : playedTokens;
  const longerTokens =
    titleTokens.size <= playedTokens.size ? playedTokens : titleTokens;

  // Account for harmless catalog words such as "The" inserted in a title.
  const meaningfulShorterTokens = [...shorterTokens].filter(
    (token) => token !== "the"
  );
  if (
    meaningfulShorterTokens.length >= 2 &&
    meaningfulShorterTokens.every((token) => longerTokens.has(token)) &&
    longerTokens.size - shorterTokens.size <= 2
  ) {
    return 0.88;
  }

  // A longer subtitle is safe when it starts with the complete shorter title.
  if (
    shorterTokens.size >= 2 &&
    (titleName.startsWith(`${playedName} `) ||
      playedName.startsWith(`${titleName} `))
  ) {
    return 0.84;
  }

  return sharedTokens.length / Math.max(titleTokens.size, playedTokens.size) >=
    0.8
    ? 0.8
    : 0;
}

function nameMatchScore(title: TrophyTitle, played: PlayedTitle): number {
  const titleName = canonicalName(title.trophyTitleName);
  if (!titleName) return 0;

  return Math.max(
    ...playedNameCandidates(played).map((name) =>
      nameMatchScoreForNames(titleName, canonicalName(name))
    ),
    0
  );
}

function findPlayedTitle(
  title: TrophyTitle,
  playedTitles: PlayedTitle[],
  matchedPlayed: Set<PlayedTitle>
): PlayedTitle | undefined {
  const available = playedTitles.filter(
    (played) => !matchedPlayed.has(played) && !isMediaApp(played)
  );

  const directMatch = available.find(
    (played) => titleIdsMatch(title, played) && platformsMatch(title, played)
  );
  if (directMatch) return directMatch;

  const sameIdMatch = available.find(
    (played) => titleIdsMatch(title, played) && platformsMatch(title, played)
  );
  if (sameIdMatch) return sameIdMatch;

  if (isDeathStrandingDirectorsCutTitle(title)) {
    const directorCutMatch = available
      .filter(isDeathStrandingDirectorsCutPlayed)
      .sort(
        (a, b) => parsePlayDuration(b.playDuration) - parsePlayDuration(a.playDuration)
      )[0];
    if (directorCutMatch) return directorCutMatch;
  }

  const nameCandidates = available
    .filter((played) => platformsMatch(title, played))
    .map((played) => ({ played, score: nameMatchScore(title, played) }))
    .filter(({ score }) => score >= 0.84)
    .sort(
      (a, b) =>
        b.score - a.score ||
        parsePlayDuration(b.played.playDuration) -
          parsePlayDuration(a.played.playDuration)
    );
  if (!nameCandidates.length) return undefined;

  // Do not force a fuzzy match when two different catalog records are equally
  // plausible. Exact IDs and exact/declared name variants still win above.
  const [best, second] = nameCandidates;
  if (second && best.score < 1 && best.score - second.score < 0.04) {
    return undefined;
  }
  return best.played;
}

function toTimestamp(value?: string): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : 0;
}

function parsePlayDuration(duration?: string): number {
  if (!duration) return 0;

  const match = duration.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
  );
  if (!match) return 0;

  const [, days, hours, minutes, seconds] = match;
  return Math.round(
    Number(days || 0) * 86_400 +
      Number(hours || 0) * 3_600 +
      Number(minutes || 0) * 60 +
      Number(seconds || 0)
  );
}

function safeCounts(value: Partial<TrophyCounts> | undefined): TrophyCounts {
  const empty = emptyTrophyCounts();
  return {
    bronze: Number(value?.bronze) || empty.bronze,
    silver: Number(value?.silver) || empty.silver,
    gold: Number(value?.gold) || empty.gold,
    platinum: Number(value?.platinum) || empty.platinum,
  };
}

function pickAvatar(avatars?: Array<{ size: string; url: string }>): string {
  if (!avatars?.length) return "";
  return (
    avatars.find((avatar) => avatar.size === "m")?.url ||
    avatars.find((avatar) => avatar.size === "l")?.url ||
    avatars[0].url
  );
}

async function resolveProfile(
  authorization: { accessToken: string },
  psnId: string
): Promise<{ accountId: string; searchProfile: PlayStationProfile }> {
  const searchResponse = await makeUniversalSearch(
    authorization,
    psnId,
    "SocialAllAccounts"
  );

  const results = searchResponse.domainResponses.flatMap((domain) =>
    domain.results
  ) as Array<{
    socialMetadata?: {
      accountId?: string;
      onlineId?: string;
      avatarUrl?: string;
    };
  }>;

  const result =
    results.find(
      (item) =>
        item.socialMetadata?.onlineId?.toLocaleLowerCase() ===
        psnId.toLocaleLowerCase()
    ) || results[0];
  const accountId = result?.socialMetadata?.accountId;

  if (!accountId) {
    throw new Error(`PSN ID "${psnId}" was not found.`);
  }

  return {
    accountId,
    searchProfile: {
      accountId,
      onlineId: result.socialMetadata?.onlineId || psnId,
      avatarUrl: result.socialMetadata?.avatarUrl || "",
    },
  };
}

async function fetchAllTrophyTitles(
  authorization: { accessToken: string },
  accountId: string
) {
  const titles: Awaited<ReturnType<typeof getUserTitles>>["trophyTitles"] = [];
  let offset = 0;

  for (let page = 0; page < 20; page += 1) {
    const response = await getUserTitles(authorization, accountId, {
      limit: 800,
      offset,
    });
    titles.push(...response.trophyTitles);

    const nextOffset = response.nextOffset;
    if (
      !response.trophyTitles.length ||
      nextOffset === undefined ||
      nextOffset <= offset ||
      titles.length >= response.totalItemCount
    ) {
      break;
    }
    offset = nextOffset;
  }

  return titles;
}

async function fetchAllPlayedGames(
  authorization: { accessToken: string },
  accountId: string
) {
  const titles: Awaited<ReturnType<typeof getUserPlayedGames>>["titles"] = [];
  let offset = 0;

  for (let page = 0; page < 20; page += 1) {
    const response = await getUserPlayedGames(authorization, accountId, {
      limit: 200,
      offset,
    });
    titles.push(...response.titles);

    const nextOffset = response.nextOffset;
    if (
      !response.titles.length ||
      nextOffset === undefined ||
      nextOffset <= offset ||
      titles.length >= response.totalItemCount
    ) {
      break;
    }
    offset = nextOffset;
  }

  return titles;
}

function normalizeGame(
  title: TrophyTitle,
  played?: PlayedTitle
): PlayStationGame {
  const definedTrophies = safeCounts(title.definedTrophies);
  const earnedTrophies = safeCounts(title.earnedTrophies);
  const lastTrophyAt = toTimestamp(title.lastUpdatedDateTime);
  const lastPlayedAt = toTimestamp(played?.lastPlayedDateTime);

  return {
    id: played?.titleId || title.npCommunicationId,
    trophyTitleId: title.npCommunicationId,
    gameFamilyId:
      played?.concept?.id === undefined ? undefined : String(played.concept.id),
    titleId: played?.titleId,
    name: title.trophyTitleName || played?.name || "Unknown title",
    iconUrl: title.trophyTitleIconUrl || played?.imageUrl || "",
    platform: String(title.trophyTitlePlatform || played?.category || "Unknown"),
    service: played?.service,
    playCount: Number(played?.playCount) || 0,
    playtimeSeconds: parsePlayDuration(played?.playDuration),
    firstPlayedAt: toTimestamp(played?.firstPlayedDateTime),
    lastPlayedAt,
    lastTrophyAt,
    trophyProgress: Number(title.progress) || 0,
    definedTrophies,
    earnedTrophies,
    hidden: Boolean(title.hiddenFlag),
  };
}

function makeUniqueGameId(
  game: PlayStationGame,
  seenIds: Map<string, number>
): PlayStationGame {
  const occurrence = (seenIds.get(game.id) || 0) + 1;
  seenIds.set(game.id, occurrence);

  return occurrence === 1
    ? game
    : { ...game, id: `${game.id}#${occurrence}` };
}

export async function fetchPlayStationData(psnId: string) {
  const authorization = await getAuthorization();
  const { accountId, searchProfile } = await resolveProfile(
    authorization,
    psnId
  );

  const [trophyTitles, playedTitles] = await Promise.all([
    fetchAllTrophyTitles(authorization, accountId),
    fetchAllPlayedGames(authorization, accountId).catch((error) => {
      // Play history is privacy-controlled independently from trophy lists.
      console.warn("Unable to read PSN play history:", error);
      return [];
    }),
  ]);

  const matchedPlayed = new Set<(typeof playedTitles)[number]>();
  const seenGameIds = new Map<string, number>();
  const games = trophyTitles.map((title) => {
    const played = findPlayedTitle(title, playedTitles, matchedPlayed);
    if (played) {
      matchedPlayed.add(played);
      if (isDeathStrandingDirectorsCutTitle(title)) {
        for (const candidate of playedTitles) {
          if (DEATH_STRANDING_DIRECTORS_CUT_RELATED_IDS.has(candidate.titleId)) {
            matchedPlayed.add(candidate);
          }
        }
      }
    }
    return makeUniqueGameId(normalizeGame(title, played), seenGameIds);
  });

  // Some PSN play-history entries have no trophy set. Keep only entries with
  // real game time; media apps and zero-duration placeholders are not games.
  for (const played of playedTitles) {
    if (
      matchedPlayed.has(played) ||
      isMediaApp(played) ||
      parsePlayDuration(played.playDuration) <= 0
    ) {
      continue;
    }
    const emptyTitle = {
      npCommunicationId: played.titleId,
      trophyTitleName: played.name || played.localizedName,
      trophyTitleIconUrl: played.imageUrl || played.localizedImageUrl,
      trophyTitlePlatform: played.category,
      progress: 0,
      definedTrophies: emptyTrophyCounts(),
      earnedTrophies: emptyTrophyCounts(),
      lastUpdatedDateTime: "",
      hiddenFlag: false,
    } as Awaited<ReturnType<typeof getUserTitles>>["trophyTitles"][number];
    games.push(makeUniqueGameId(normalizeGame(emptyTitle, played), seenGameIds));
  }

  let profile: PlayStationProfile = searchProfile;
  try {
    const profileResponse = await getProfileFromAccountId(
      authorization,
      accountId
    );
    profile = {
      accountId,
      onlineId: profileResponse.onlineId || searchProfile.onlineId,
      avatarUrl: pickAvatar(profileResponse.avatars) || searchProfile.avatarUrl,
      aboutMe: profileResponse.aboutMe,
      isPlus: profileResponse.isPlus,
    };
  } catch (error) {
    console.warn("Unable to read the PSN profile details:", error);
  }

  return {
    psnId,
    profile,
    games,
    fetchedAt: new Date().toISOString(),
  };
}
