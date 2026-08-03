import { NextRequest, NextResponse } from "next/server";
import { fetchPlayStationData } from "@/lib/psn-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const psnId = request.nextUrl.searchParams.get("psnId")?.trim();

  if (!psnId) {
    return NextResponse.json({ error: "PSN ID is required." }, { status: 400 });
  }

  if (psnId.length < 3 || psnId.length > 16 || !/^[A-Za-z0-9_-]+$/.test(psnId)) {
    return NextResponse.json(
      { error: "Enter a valid PSN Online ID (3–16 letters, numbers, _ or -)." },
      { status: 400 }
    );
  }

  try {
    const data = await fetchPlayStationData(psnId);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PSN error";
    console.error("Error fetching PlayStation data:", message);

    const status = message.includes("not found") ? 404 : 502;
    return NextResponse.json(
      {
        error:
          status === 404
            ? message
            : "Unable to read this PSN profile. Check the ID, privacy settings, and server PSN_NPSSO configuration.",
      },
      { status }
    );
  }
}
