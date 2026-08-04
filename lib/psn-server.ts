import {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  getProfileFromAccountId,
  getUserPlayedGames,
  getUserTitles,
  makeUniversalSearch,
} from "psn-api";
import type {
  PSNPage,
  PSNPlayedTitle,
  PSNTrophyTitle,
  PlayStationProfile,
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

function pickAvatar(avatars?: Array<{ size: string; url: string }>): string {
  if (!avatars?.length) return "";
  return (
    avatars.find((avatar) => avatar.size === "m")?.url ||
    avatars.find((avatar) => avatar.size === "l")?.url ||
    avatars[0].url
  );
}

export async function resolveProfile(
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

  // Universal search is fuzzy. Never use its first result as a profile
  // fallback, or a typo can silently load another user's data.
  const result = results.find(
    (item) =>
      item.socialMetadata?.onlineId?.toLocaleLowerCase() ===
      psnId.toLocaleLowerCase()
  );
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

export async function fetchPlayStationProfile(psnId: string): Promise<{
  accountId: string;
  profile: PlayStationProfile;
}> {
  const authorization = await getAuthorization();
  const { accountId, searchProfile } = await resolveProfile(
    authorization,
    psnId
  );

  let profile = searchProfile;
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

  return { accountId, profile };
}

function toPage<T>(
  items: T[],
  nextOffset?: number,
  totalItemCount?: number
): PSNPage<T> {
  return { items, nextOffset, totalItemCount };
}

export async function fetchTrophyTitlesPage(
  accountId: string,
  offset: number,
  limit: number
): Promise<PSNPage<PSNTrophyTitle>> {
  const response = await getUserTitles(await getAuthorization(), accountId, {
    limit,
    offset,
  });

  return toPage(
    response.trophyTitles as unknown as PSNTrophyTitle[],
    response.nextOffset,
    response.totalItemCount
  );
}

export async function fetchPlayedTitlesPage(
  accountId: string,
  offset: number,
  limit: number
): Promise<PSNPage<PSNPlayedTitle>> {
  const response = await getUserPlayedGames(
    await getAuthorization(),
    accountId,
    { limit, offset }
  );

  return toPage(
    response.titles as unknown as PSNPlayedTitle[],
    response.nextOffset,
    response.totalItemCount
  );
}
