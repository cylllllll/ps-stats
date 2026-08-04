const DEFAULT_STORE_LOCALE = "en-us";
const STORE_SEARCH_ORIGIN = "https://store.playstation.com";
const STORE_SEARCH_TIMEOUT_MS = 10_000;
const STORE_SEARCH_REVALIDATE_SECONDS = 60 * 60 * 24 * 7;
const STORE_COVER_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const STORE_COVER_MISS_TTL_MS = 1000 * 60 * 60 * 24;
const STORE_SEARCH_CONCURRENCY = 6;
const MAX_STORE_COVER_CACHE_ENTRIES = 5_000;

const SUPPORTED_STORE_LOCALES = new Set([
  "ar-ae",
  "bg-bg",
  "cs-cz",
  "da-dk",
  "de-de",
  "el-gr",
  "en-gb",
  "en-us",
  "es-419",
  "es-es",
  "fi-fi",
  "fr-ca",
  "fr-fr",
  "he-il",
  "hr-hr",
  "hu-hu",
  "id-id",
  "it-it",
  "ja-jp",
  "ko-kr",
  "nl-nl",
  "no-no",
  "pl-pl",
  "pt-br",
  "pt-pt",
  "ro-ro",
  "ru-ru",
  "sk-sk",
  "sl-si",
  "sr-rs",
  "sv-se",
  "th-th",
  "tr-tr",
  "uk-ua",
  "vi-vn",
  "zh-hans",
  "zh-hant",
]);

const LATIN_AMERICAN_COUNTRIES = new Set([
  "AR",
  "BO",
  "CL",
  "CO",
  "CR",
  "DO",
  "EC",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PE",
  "PR",
  "PY",
  "SV",
  "UY",
]);

const GAME_CLASSIFICATIONS = new Set([
  "FULL_GAME",
  "GAME_BUNDLE",
  "PREMIUM_EDITION",
]);

const NON_GAME_NAME_PATTERN =
  /\b(?:add[ -]?on|costume|demo|friend s pass|season pass|soundtrack|trial|upgrade|virtual currency)\b/i;

interface StoreMedia {
  role?: string;
  type?: string;
  url?: string;
}

interface StoreProduct {
  __typename?: string;
  id?: string;
  name?: string;
  npTitleId?: string;
  platforms?: string[];
  storeDisplayClassification?: string;
  media?: StoreMedia[];
}

interface StoreSearchResponse {
  results?: Array<{ __ref?: string }>;
}

interface StoreNextData {
  props?: {
    apolloState?: Record<string, unknown> & {
      ROOT_QUERY?: Record<string, unknown>;
    };
  };
}

export interface PS4StoreCoverRequest {
  id: string;
  name: string;
}

export interface PS4StoreCover {
  imageUrl: string;
  productId: string;
  productName: string;
  titleId?: string;
}

export interface StoreLocaleHint {
  country?: string;
  language?: string;
}

interface CachedCover {
  expiresAt: number;
  value: PS4StoreCover | null;
}

interface RankedProduct {
  cover: PS4StoreCover;
  classificationPriority: number;
  index: number;
  score: number;
}

const coverCache = new Map<string, CachedCover>();
const pendingCovers = new Map<string, Promise<PS4StoreCover | null>>();

function cacheCover(key: string, value: CachedCover): void {
  if (
    !coverCache.has(key) &&
    coverCache.size >= MAX_STORE_COVER_CACHE_ENTRIES
  ) {
    const oldestKey = coverCache.keys().next().value;
    if (oldestKey) coverCache.delete(oldestKey);
  }
  coverCache.set(key, value);
}

function normalizeTitle(value: string): string {
  return value
    .replace(/[®™©]/g, " ")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\b(?:iii|ii|iv)\b/g, (roman) => {
      if (roman === "iii") return "3";
      if (roman === "ii") return "2";
      return "4";
    })
    .replace(/\bplaystation\s*[45]\b/g, " ")
    .replace(/\bps[45]\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(?:trophies|trophy)\b$/g, "")
    .trim();
}

function resolveStoreLocale(hint?: StoreLocaleHint): string {
  const country = String(hint?.country || "").trim().toLocaleUpperCase();
  const language = String(hint?.language || "")
    .trim()
    .toLocaleLowerCase()
    .replace("_", "-");
  const baseLanguage = language.split("-")[0];

  if (
    baseLanguage === "zh" ||
    baseLanguage === "ch" ||
    ["CN", "HK", "MO", "TW"].includes(country)
  ) {
    return language.includes("hans") || country === "CN"
      ? "zh-hans"
      : "zh-hant";
  }
  if (baseLanguage === "es" && LATIN_AMERICAN_COUNTRIES.has(country)) {
    return "es-419";
  }

  const exactLocale = `${baseLanguage}-${country.toLocaleLowerCase()}`;
  if (SUPPORTED_STORE_LOCALES.has(exactLocale)) return exactLocale;

  if (country === "JP") return "ja-jp";
  if (country === "KR") return "ko-kr";
  if (country === "GB" || baseLanguage === "en") {
    return country === "US" ? "en-us" : "en-gb";
  }
  if (baseLanguage === "fr") return country === "CA" ? "fr-ca" : "fr-fr";
  if (baseLanguage === "pt") return country === "BR" ? "pt-br" : "pt-pt";
  if (baseLanguage === "es") return "es-es";
  return DEFAULT_STORE_LOCALE;
}

function withoutEditionSuffix(value: string): string {
  return value
    .replace(/\s+(?:digital\s+)?(?:[a-z0-9]+\s+){0,2}edition$/u, "")
    .trim();
}

function words(value: string): string[] {
  return value.split(" ").filter(Boolean);
}

function titleMatchScore(requestName: string, productName: string): number {
  const requested = normalizeTitle(requestName);
  const product = normalizeTitle(productName);
  if (!requested || !product) return 0;
  if (requested === product) return 1;
  if (requested === withoutEditionSuffix(product)) return 0.98;

  const requestedWords = words(requested);
  const productWords = words(product);
  if (product.startsWith(`${requested} `)) {
    const extraWordCount = productWords.length - requestedWords.length;
    if (requestedWords.length >= 2) {
      return Math.max(0.87, 0.94 - extraWordCount * 0.01);
    }
    if (requested.length >= 5) return 0.87;
  }

  if (requestedWords.length < 3) return 0;
  const productWordSet = new Set(productWords);
  const sharedWordCount = requestedWords.filter((word) =>
    productWordSet.has(word)
  ).length;
  const requestedCoverage = sharedWordCount / requestedWords.length;
  const productCoverage = sharedWordCount / productWords.length;

  return requestedCoverage === 1 && productCoverage >= 0.6 ? 0.88 : 0;
}

function isStoreProduct(value: unknown): value is StoreProduct {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as StoreProduct).__typename === "Product"
  );
}

function parseSearchProducts(html: string): StoreProduct[] {
  const nextDataMatch = html.match(
    /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!nextDataMatch) {
    throw new Error("PlayStation Store search data was not found.");
  }

  const nextData = JSON.parse(nextDataMatch[1]) as StoreNextData;
  const apolloState = nextData.props?.apolloState;
  const rootQuery = apolloState?.ROOT_QUERY;
  if (!apolloState || !rootQuery) return [];

  const searchResponse = Object.entries(rootQuery).find(
    ([key, value]) =>
      key.startsWith("universalSearch(") &&
      typeof value === "object" &&
      value !== null
  )?.[1] as StoreSearchResponse | undefined;

  return (searchResponse?.results || [])
    .map((result) => (result.__ref ? apolloState[result.__ref] : undefined))
    .filter(isStoreProduct);
}

function masterImageUrl(product: StoreProduct): string {
  return (
    product.media?.find(
      (media) =>
        media.role?.toLocaleUpperCase() === "MASTER" &&
        media.type?.toLocaleUpperCase() === "IMAGE"
    )?.url || ""
  );
}

function classificationPriority(classification: string): number {
  if (classification === "FULL_GAME") return 3;
  if (classification === "GAME_BUNDLE") return 2;
  return 1;
}

function bestProduct(
  requestName: string,
  products: StoreProduct[]
): PS4StoreCover | null {
  const ranked = products
    .map((product, index): RankedProduct | null => {
      const classification = String(product.storeDisplayClassification || "");
      const productName = String(product.name || "");
      const productId = String(product.id || "");
      const imageUrl = masterImageUrl(product);
      if (
        !GAME_CLASSIFICATIONS.has(classification) ||
        !product.platforms?.includes("PS4") ||
        !productName ||
        !productId ||
        !imageUrl ||
        NON_GAME_NAME_PATTERN.test(normalizeTitle(productName))
      ) {
        return null;
      }

      const score = titleMatchScore(requestName, productName);
      if (score < 0.86) return null;

      return {
        cover: {
          imageUrl,
          productId,
          productName,
          titleId: product.npTitleId,
        },
        classificationPriority: classificationPriority(classification),
        index,
        score,
      };
    })
    .filter((product): product is RankedProduct => product !== null)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.classificationPriority - left.classificationPriority ||
        left.index - right.index
    );

  const [best, second] = ranked;
  if (!best) return null;
  if (
    best.score < 0.98 &&
    second &&
    best.score - second.score < 0.04 &&
    best.cover.titleId !== second.cover.titleId
  ) {
    return null;
  }

  return best.cover;
}

async function fetchSearchProducts(
  searchTerm: string,
  locale: string
): Promise<StoreProduct[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STORE_SEARCH_TIMEOUT_MS);
  const searchUrl = `${STORE_SEARCH_ORIGIN}/${locale}/search/${encodeURIComponent(searchTerm)}`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (compatible; PlayStationStatsCoverResolver/1.0)",
      },
      next: { revalidate: STORE_SEARCH_REVALIDATE_SECONDS },
      signal: controller.signal,
    });
    if (response.status === 404) return [];
    if (!response.ok) {
      throw new Error(`PlayStation Store search returned HTTP ${response.status}.`);
    }

    return parseSearchProducts(await response.text());
  } finally {
    clearTimeout(timeout);
  }
}

async function searchStoreCover(
  name: string,
  locale: string
): Promise<PS4StoreCover | null> {
  const locales =
    locale === DEFAULT_STORE_LOCALE
      ? [locale]
      : /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(
            name
          )
        ? [locale, DEFAULT_STORE_LOCALE]
        : [DEFAULT_STORE_LOCALE, locale];

  for (const searchLocale of locales) {
    const directMatch = bestProduct(
      name,
      await fetchSearchProducts(name, searchLocale)
    );
    if (directMatch) return directMatch;

    // Adding the platform is a generic second pass that promotes a base game
    // when a title's unqualified search is dominated by DLC or costumes.
    const platformMatch = bestProduct(
      name,
      await fetchSearchProducts(`${name} PS4`, searchLocale)
    );
    if (platformMatch) return platformMatch;
  }

  return null;
}

async function resolveStoreCover(
  name: string,
  locale: string
): Promise<PS4StoreCover | null> {
  const normalizedName = normalizeTitle(name);
  if (!normalizedName) return null;
  const key = `${locale}:${normalizedName}`;

  const cached = coverCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const pending = pendingCovers.get(key);
  if (pending) return pending;

  const lookup = searchStoreCover(name, locale)
    .then((value) => {
      cacheCover(key, {
        expiresAt:
          Date.now() +
          (value ? STORE_COVER_CACHE_TTL_MS : STORE_COVER_MISS_TTL_MS),
        value,
      });
      return value;
    })
    .finally(() => pendingCovers.delete(key));
  pendingCovers.set(key, lookup);
  return lookup;
}

export async function resolvePS4StoreCovers(
  requests: PS4StoreCoverRequest[],
  localeHint?: StoreLocaleHint
): Promise<Record<string, PS4StoreCover>> {
  const covers: Record<string, PS4StoreCover> = {};
  const locale = resolveStoreLocale(localeHint);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < requests.length) {
      const request = requests[nextIndex];
      nextIndex += 1;
      try {
        const cover = await resolveStoreCover(request.name, locale);
        if (cover) covers[request.id] = cover;
      } catch (error) {
        console.warn(
          `[PS Store] Unable to resolve a PS4 cover for "${request.name}":`,
          error
        );
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(STORE_SEARCH_CONCURRENCY, requests.length) },
      () => worker()
    )
  );
  return covers;
}
