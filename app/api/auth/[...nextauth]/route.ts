import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextRequest } from "next/server";
import {
  exchangeNpssoForAccessToken,
  fetchPlayStationProfile,
} from "@/lib/playstation";

interface PlayStationUser {
  id: string;
  name: string;
  image?: string | null;
  accountId?: string | null;
  accessToken: string;
  npsso: string;
}

async function handler(
  req: NextRequest,
  ctx: { params: Promise<{ nextauth: string[] }> }
) {
  return NextAuth(req, ctx, {
    providers: [
      CredentialsProvider({
        name: "PlayStation NSSO",
        credentials: {
          npsso: { label: "NSSO", type: "text" },
        },
        async authorize(credentials) {
          const npsso = credentials?.npsso?.trim();
          if (!npsso) {
            throw new Error("NSSO token is required");
          }

          const { accessToken } = await exchangeNpssoForAccessToken(npsso);
          const profile = await fetchPlayStationProfile(accessToken);

          const user: PlayStationUser = {
            id: profile.accountId || profile.onlineId || "playstation-user",
            name: profile.onlineId || "PlayStation 用户",
            image: profile.avatarUrl,
            accountId: profile.accountId || null,
            accessToken,
            npsso,
          };

          return user;
        },
      }),
    ],
    pages: {
      error: "/auth/error",
    },
    callbacks: {
      async session({ session, token }) {
        if (session?.user) {
          // @ts-expect-error - custom properties
          session.user.steamId = token.accountId || token.sub;
          // @ts-expect-error - custom properties
          session.user.accountId = token.accountId || token.sub;
          // @ts-expect-error - custom properties
          session.user.accessToken = token.accessToken;
        }
        return session;
      },
      async jwt({ token, user }) {
        const psUser = user as PlayStationUser | undefined;
        if (psUser) {
          // @ts-expect-error - custom properties
          token.accountId = psUser.accountId || psUser.id;
          // @ts-expect-error - custom properties
          token.accessToken = psUser.accessToken;
          // @ts-expect-error - custom properties
          token.npsso = psUser.npsso;
        }
        return token;
      },
    },
  });
}

export { handler as GET, handler as POST };
