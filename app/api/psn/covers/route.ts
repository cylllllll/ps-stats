import { NextRequest, NextResponse } from "next/server";
import {
  resolvePS4StoreCovers,
  type PS4StoreCoverRequest,
  type StoreLocaleHint,
} from "@/lib/ps-store-cover";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_COVER_REQUESTS = 100;
const MAX_TITLE_NAME_LENGTH = 200;
const MAX_TITLE_ID_LENGTH = 80;

function isCoverRequest(value: unknown): value is PS4StoreCoverRequest {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Partial<PS4StoreCoverRequest>;
  return (
    typeof request.id === "string" &&
    request.id.length > 0 &&
    request.id.length <= MAX_TITLE_ID_LENGTH &&
    typeof request.name === "string" &&
    request.name.trim().length > 0 &&
    request.name.length <= MAX_TITLE_NAME_LENGTH
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The cover request must be valid JSON." },
      { status: 400 }
    );
  }

  const requests =
    typeof body === "object" && body !== null && "titles" in body
      ? (body as { titles?: unknown }).titles
      : undefined;
  const localeHint =
    typeof body === "object" && body !== null && "locale" in body
      ? (body as { locale?: unknown }).locale
      : undefined;
  if (!Array.isArray(requests) || requests.length > MAX_COVER_REQUESTS) {
    return NextResponse.json(
      { error: `Send an array of at most ${MAX_COVER_REQUESTS} PS4 titles.` },
      { status: 400 }
    );
  }
  if (!requests.every(isCoverRequest)) {
    return NextResponse.json(
      { error: "Each PS4 title needs a valid id and name." },
      { status: 400 }
    );
  }
  if (
    localeHint !== undefined &&
    (typeof localeHint !== "object" ||
      localeHint === null ||
      ("country" in localeHint &&
        (typeof (localeHint as StoreLocaleHint).country !== "string" ||
          ((localeHint as StoreLocaleHint).country?.length || 0) > 10)) ||
      ("language" in localeHint &&
        (typeof (localeHint as StoreLocaleHint).language !== "string" ||
          ((localeHint as StoreLocaleHint).language?.length || 0) > 20)))
  ) {
    return NextResponse.json(
      { error: "The Store locale hint is invalid." },
      { status: 400 }
    );
  }

  const uniqueRequests = [
    ...new Map(
      requests.map((title) => [
        title.id,
        { id: title.id, name: title.name.trim() },
      ])
    ).values(),
  ];
  const covers = await resolvePS4StoreCovers(
    uniqueRequests,
    localeHint as StoreLocaleHint | undefined
  );
  return NextResponse.json({ covers });
}
