import { NextRequest, NextResponse } from "next/server";
import { fetchPlayStationProfile } from "@/lib/psn-server";
import { psnErrorResponse, readPsnId } from "@/app/api/psn/request-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const input = readPsnId(request);
  if (!input.ok) return input.response;

  try {
    const data = await fetchPlayStationProfile(input.psnId);
    return NextResponse.json({ psnId: input.psnId, ...data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return psnErrorResponse(
      "Error fetching PlayStation profile",
      error,
      message.includes("not found")
    );
  }
}
