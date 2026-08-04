import { NextRequest, NextResponse } from "next/server";
import { fetchPlayedTitlesPage } from "@/lib/psn-server";
import {
  psnErrorResponse,
  readPageRequest,
} from "@/app/api/psn/request-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const input = readPageRequest(request);
  if (!input.ok) return input.response;

  try {
    const page = await fetchPlayedTitlesPage(
      input.params.accountId,
      input.params.offset,
      input.params.limit
    );
    return NextResponse.json(page);
  } catch (error) {
    return psnErrorResponse("Error fetching PlayStation played titles", error);
  }
}
