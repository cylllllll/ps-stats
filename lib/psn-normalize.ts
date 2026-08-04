import type {
  PSNPlayedTitle,
  PSNTrophyTitle,
  PlayStationGame,
  PlayStationProfile,
  PlayStationGamesResponse,
  TrophyCounts,
} from "@/app/types/playstation";
import { isAppPlatform, isPS4Platform } from "@/lib/playstation";

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

type PlatformFamily = "PS4" | "PS5" | null;

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

interface NameIndexEntry {
  value: string;
  tokens: Set<string>;
}

interface IndexedPlayedTitle {
  played: PSNPlayedTitle;
  durationSeconds: number;
  platform: PlatformFamily;
  names: NameIndexEntry[];
}

interface PlayedTitleIndex {
  all: IndexedPlayedTitle[];
  byTitleId: Map<string, IndexedPlayedTitle[]>;
  byToken: Map<string, IndexedPlayedTitle[]>;
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

function canonicalName(name: string): string {
  const normalized = normalizeName(name).replace(/\btrophies\b$/g, "").trim();
  return TITLE_NAME_VARIANT_LOOKUP.get(normalized) || normalized;
}

function platformFamily(platform?: string): PlatformFamily {
  const value = String(platform || "").toLocaleUpperCase();
  if (value.includes("PS5")) return "PS5";
  if (value.includes("PS4")) return "PS4";
  return null;
}

function playedPlatform(played: PSNPlayedTitle): PlatformFamily {
  return platformFamily(played.category) || platformFamily(played.titleId);
}

function platformsMatch(
  titlePlatform: PlatformFamily,
  playedPlatformValue: PlatformFamily
): boolean {
  return (
    !titlePlatform ||
    !playedPlatformValue ||
    titlePlatform === playedPlatformValue
  );
}

function playedNameCandidates(played: PSNPlayedTitle): string[] {
  const concept = played.concept;
  const localizedNames = Object.values(concept?.localizedName?.metadata || {});

  return [
    played.name,
    played.localizedName,
    concept?.name,
    ...localizedNames,
  ].filter(
    (name): name is string =>
      typeof name === "string" && name.trim().length > 0
  );
}

function isDeathStrandingDirectorsCutTitle(title: PSNTrophyTitle): boolean {
  return normalizeName(title.trophyTitleName) === DEATH_STRANDING_DIRECTORS_CUT_NAME;
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

function addToIndex(
  index: Map<string, IndexedPlayedTitle[]>,
  key: string | undefined,
  value: IndexedPlayedTitle
): void {
  if (!key) return;
  const values = index.get(key);
  if (values) {
    values.push(value);
  } else {
    index.set(key, [value]);
  }
}

function buildPlayedTitleIndex(playedTitles: PSNPlayedTitle[]): PlayedTitleIndex {
  const index: PlayedTitleIndex = {
    all: [],
    byTitleId: new Map(),
    byToken: new Map(),
  };

  for (const played of playedTitles) {
    const names = [
      ...new Set(playedNameCandidates(played).map(canonicalName)),
    ]
      .filter(Boolean)
      .map((value) => ({
        value,
        tokens: new Set(value.split(" ").filter(Boolean)),
      }));
    const indexed: IndexedPlayedTitle = {
      played,
      durationSeconds: parsePlayDuration(played.playDuration),
      platform: playedPlatform(played),
      names,
    };

    index.all.push(indexed);
    // Keep apps available as played-only records, but never let their IDs or
    // names participate in trophy-title matching.
    if (isAppPlatform(played.category || "")) continue;

    const titleIds = new Set([
      played.titleId,
      ...(played.concept?.titleIds || []),
    ]);
    for (const titleId of titleIds) {
      addToIndex(index.byTitleId, titleId, indexed);
    }
    for (const name of names) {
      for (const token of name.tokens) {
        addToIndex(index.byToken, token, indexed);
      }
    }
  }

  return index;
}

function titleIdsMatch(title: PSNTrophyTitle, played: PSNPlayedTitle): boolean {
  return (
    title.npCommunicationId === played.titleId ||
    played.concept?.titleIds?.includes(title.npCommunicationId) === true
  );
}

function nameMatchScoreForNames(
  titleName: string,
  titleTokens: Set<string>,
  names: NameIndexEntry[]
): number {
  return Math.max(
    ...names.map(({ value: playedName, tokens: playedTokens }) => {
      if (!titleName || !playedName) return 0;
      if (titleName === playedName) return 1;

      const sharedTokens = [...titleTokens].filter((token) =>
        playedTokens.has(token)
      );
      const shorterTokens =
        titleTokens.size <= playedTokens.size ? titleTokens : playedTokens;
      const longerTokens =
        titleTokens.size <= playedTokens.size ? playedTokens : titleTokens;
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
    }),
    0
  );
}

function findPlayedTitle(
  title: PSNTrophyTitle,
  index: PlayedTitleIndex,
  matchedPlayed: Set<IndexedPlayedTitle>
): IndexedPlayedTitle | undefined {
  const titlePlatform = platformFamily(title.trophyTitlePlatform);
  const idCandidates = index.byTitleId.get(title.npCommunicationId) || [];
  const directMatch = idCandidates.find(
    (candidate) =>
      !matchedPlayed.has(candidate) &&
      platformsMatch(titlePlatform, candidate.platform) &&
      titleIdsMatch(title, candidate.played)
  );
  if (directMatch) return directMatch;

  if (isDeathStrandingDirectorsCutTitle(title)) {
    const directorCutCandidates = new Set<IndexedPlayedTitle>();
    for (const titleId of DEATH_STRANDING_DIRECTORS_CUT_TITLE_IDS) {
      for (const candidate of index.byTitleId.get(titleId) || []) {
        if (!matchedPlayed.has(candidate)) directorCutCandidates.add(candidate);
      }
    }
    const directorCutMatch = [...directorCutCandidates].sort(
      (a, b) => b.durationSeconds - a.durationSeconds
    )[0];
    if (directorCutMatch) return directorCutMatch;
  }

  const titleName = canonicalName(title.trophyTitleName);
  if (!titleName) return undefined;
  const titleTokens = new Set(titleName.split(" ").filter(Boolean));
  const fuzzyCandidates = new Set<IndexedPlayedTitle>();
  for (const token of titleTokens) {
    for (const candidate of index.byToken.get(token) || []) {
      if (!matchedPlayed.has(candidate)) fuzzyCandidates.add(candidate);
    }
  }

  const nameCandidates = [...fuzzyCandidates]
    .filter((candidate) => platformsMatch(titlePlatform, candidate.platform))
    .map((candidate) => ({
      played: candidate,
      score: nameMatchScoreForNames(titleName, titleTokens, candidate.names),
    }))
    .filter(({ score }) => score >= 0.84)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.played.durationSeconds - a.played.durationSeconds
    );
  if (!nameCandidates.length) return undefined;

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

function safeCounts(value: Partial<TrophyCounts> | undefined): TrophyCounts {
  return {
    bronze: Number(value?.bronze) || 0,
    silver: Number(value?.silver) || 0,
    gold: Number(value?.gold) || 0,
    platinum: Number(value?.platinum) || 0,
  };
}

function preferredPlayedIconUrl(played?: PSNPlayedTitle): string {
  const masterImageUrl = played?.concept?.media?.images?.find(
    (image) => image.type?.toLocaleUpperCase() === "MASTER"
  )?.url;

  return (
    masterImageUrl ||
    played?.localizedImageUrl ||
    played?.imageUrl ||
    ""
  );
}

function gameIconUrl(title: PSNTrophyTitle, played?: PSNPlayedTitle): string {
  const trophyIconUrl = title.trophyTitleIconUrl || "";
  const playedIconUrl = preferredPlayedIconUrl(played);
  const platform = String(title.trophyTitlePlatform || played?.category || "");

  return isPS4Platform(platform)
    ? playedIconUrl || trophyIconUrl
    : trophyIconUrl || playedIconUrl;
}

function normalizeGame(
  title: PSNTrophyTitle,
  played?: PSNPlayedTitle
): PlayStationGame {
  const definedTrophies = safeCounts(title.definedTrophies);
  const earnedTrophies = safeCounts(title.earnedTrophies);

  return {
    id: played?.titleId || title.npCommunicationId,
    trophyTitleId: title.npCommunicationId,
    gameFamilyId:
      played?.concept?.id === undefined ? undefined : String(played.concept.id),
    titleId: played?.titleId,
    name: title.trophyTitleName || played?.name || "Unknown title",
    iconUrl: gameIconUrl(title, played),
    platform: String(title.trophyTitlePlatform || played?.category || "Unknown"),
    service: played?.service,
    playCount: Number(played?.playCount) || 0,
    playtimeSeconds: parsePlayDuration(played?.playDuration),
    firstPlayedAt: toTimestamp(played?.firstPlayedDateTime),
    lastPlayedAt: toTimestamp(played?.lastPlayedDateTime),
    lastTrophyAt: toTimestamp(title.lastUpdatedDateTime),
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

export function normalizePlayStationGames(
  psnId: string,
  profile: PlayStationProfile,
  trophyTitles: PSNTrophyTitle[],
  playedTitles: PSNPlayedTitle[]
): PlayStationGamesResponse {
  const playedIndex = buildPlayedTitleIndex(playedTitles);
  const matchedPlayed = new Set<IndexedPlayedTitle>();
  const seenGameIds = new Map<string, number>();
  const games = trophyTitles.map((title) => {
    const played = findPlayedTitle(title, playedIndex, matchedPlayed);
    if (played) {
      matchedPlayed.add(played);
      if (isDeathStrandingDirectorsCutTitle(title)) {
        for (const titleId of DEATH_STRANDING_DIRECTORS_CUT_RELATED_IDS) {
          for (const candidate of playedIndex.byTitleId.get(titleId) || []) {
            matchedPlayed.add(candidate);
          }
        }
      }
    }
    return makeUniqueGameId(normalizeGame(title, played?.played), seenGameIds);
  });

  for (const indexedPlayed of playedIndex.all) {
    const played = indexedPlayed.played;
    const hasAppActivity =
      isAppPlatform(played.category || "") &&
      (Number(played.playCount) > 0 ||
        Boolean(played.firstPlayedDateTime) ||
        Boolean(played.lastPlayedDateTime));
    if (
      matchedPlayed.has(indexedPlayed) ||
      (indexedPlayed.durationSeconds <= 0 && !hasAppActivity)
    ) {
      continue;
    }
    const emptyTitle: PSNTrophyTitle = {
      npCommunicationId: played.titleId,
      trophyTitleName: played.name || played.localizedName || "Unknown title",
      trophyTitleIconUrl: preferredPlayedIconUrl(played),
      trophyTitlePlatform: played.category,
      progress: 0,
      definedTrophies: {},
      earnedTrophies: {},
      lastUpdatedDateTime: "",
      hiddenFlag: false,
    };
    games.push(makeUniqueGameId(normalizeGame(emptyTitle, played), seenGameIds));
  }

  return {
    psnId,
    profile,
    games,
    fetchedAt: new Date().toISOString(),
  };
}
