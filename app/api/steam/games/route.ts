import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { fetchPlayStationGames } from "@/lib/playstation";

function mapTitlesToGames(titles: Awaited<ReturnType<typeof fetchPlayStationGames>>) {
  return titles.map((title, index) => {
    const parsedId = title.titleId ? parseInt(title.titleId.replace(/\D/g, ""), 10) : index;
    const playMinutes = Math.round(((title.playDuration || 0) / 60));
    const lastPlayed = title.lastPlayedDateTime
      ? Math.floor(new Date(title.lastPlayedDateTime).getTime() / 1000)
      : 0;

    return {
      appid: Number.isNaN(parsedId) ? index : parsedId,
      name: title.name || title.titleId || `Game ${index + 1}`,
      playtime_forever: playMinutes,
      img_icon_url: title.media?.boxArt || title.media?.tile || "",
      rtime_last_played: lastPlayed,
    };
  });
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });

  if (!token?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const titles = await fetchPlayStationGames(token.accessToken as string);
    const games = mapTitlesToGames(titles);
    return NextResponse.json({ response: { games } });
  } catch (error) {
    console.error("Error fetching games:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
