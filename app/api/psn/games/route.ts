import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      error:
        "This endpoint is deprecated. Use /api/psn/profile, /api/psn/titles, and /api/psn/played.",
    },
    { status: 410 }
  );
}
