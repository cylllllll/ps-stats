import { NextRequest, NextResponse } from "next/server";

const PSN_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const ACCOUNT_ID_PATTERN = /^\d{5,30}$/;
const DEFAULT_PAGE_SIZE = 200;
const MAX_PAGE_SIZE = 200;

type ValidatedPsnId = {
  ok: true;
  psnId: string;
};

type InvalidRequest = {
  ok: false;
  response: NextResponse;
};

export type PageRequest = {
  accountId: string;
  offset: number;
  limit: number;
};

type ValidatedPageRequest = {
  ok: true;
  params: PageRequest;
};

export function readPsnId(request: NextRequest): ValidatedPsnId | InvalidRequest {
  const psnId = request.nextUrl.searchParams.get("psnId")?.trim();

  if (!psnId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "PSN ID is required." },
        { status: 400 }
      ),
    };
  }

  if (psnId.length < 3 || psnId.length > 16 || !PSN_ID_PATTERN.test(psnId)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Enter a valid PSN Online ID (3–16 letters, numbers, _ or -)." },
        { status: 400 }
      ),
    };
  }

  return { ok: true, psnId };
}

export function readPageRequest(
  request: NextRequest
): ValidatedPageRequest | InvalidRequest {
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId")?.trim();
  const offsetValue = searchParams.get("offset") || "0";
  const limitValue = searchParams.get("limit") || String(DEFAULT_PAGE_SIZE);
  const offset = Number(offsetValue);
  const requestedLimit = Number(limitValue);

  if (!accountId || !ACCOUNT_ID_PATTERN.test(accountId)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "A valid PSN account ID is required." },
        { status: 400 }
      ),
    };
  }

  if (!Number.isSafeInteger(offset) || offset < 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "The page offset must be a non-negative integer." },
        { status: 400 }
      ),
    };
  }

  if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "The page limit must be a positive integer." },
        { status: 400 }
      ),
    };
  }

  return {
    ok: true,
    params: {
      accountId,
      offset,
      limit: Math.min(requestedLimit, MAX_PAGE_SIZE),
    },
  };
}

export function psnErrorResponse(
  context: string,
  error: unknown,
  notFound = false
): NextResponse {
  const message = error instanceof Error ? error.message : "Unknown PSN error";
  console.error(`${context}:`, message);

  return NextResponse.json(
    {
      error: notFound
        ? message
        : "Unable to read this PSN data. Check the ID, privacy settings, and server PSN_NPSSO configuration.",
    },
    { status: notFound ? 404 : 502 }
  );
}
