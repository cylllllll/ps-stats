export interface PlayStationProfile {
  accountId?: string;
  onlineId?: string;
  avatarUrl?: string;
}

export interface PlayStationTitle {
  titleId?: string;
  name?: string;
  playDuration?: number;
  lastPlayedDateTime?: string;
  media?: {
    boxArt?: string;
    tile?: string;
  };
}

const DEFAULT_CLIENT_ID =
  process.env.PSN_CLIENT_ID || "09515159-7237-4370-9b40-3806e67c0891";

export async function exchangeNpssoForAccessToken(npsso: string) {
  const params = new URLSearchParams();
  params.append("grant_type", "urn:ietf:params:oauth:grant-type:token-exchange");
  params.append("client_id", DEFAULT_CLIENT_ID);
  params.append("subject_token", npsso);
  params.append("subject_token_type", "urn:ietf:params:oauth:token-type:psn:oauth");

  const res = await fetch("https://ca.account.sony.com/api/authz/v3/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to exchange NSSO token (${res.status}): ${body}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    expiresIn: data.expires_in as number,
  };
}

export async function fetchPlayStationProfile(accessToken: string): Promise<PlayStationProfile> {
  const res = await fetch("https://m.np.playstation.net/api/userProfile/v1/internal/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch profile (${res.status}): ${body}`);
  }

  return res.json();
}

export async function fetchPlayStationGames(accessToken: string): Promise<PlayStationTitle[]> {
  const res = await fetch(
    "https://m.np.playstation.net/api/library/v1/titles?limit=800&offset=0&includeFields=media,playDuration,lastPlayedDateTime",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch titles (${res.status}): ${body}`);
  }

  const data = await res.json();
  return (data?.titles as PlayStationTitle[]) || [];
}
