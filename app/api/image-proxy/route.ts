import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_DOMAINS = [
  "image.api.playstation.com",
  "web.np.playstation.com",
  "image.api.np.playstation.com",
  "psnobj.prod.dl.playstation.net",
  "psn-rsc.prod.dl.playstation.net",
  "static-resource.np.community.playstation.net",
];
const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

class ImageProxyError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

function hasBytes(bytes: Uint8Array, offset: number, values: number[]): boolean {
  return values.every((value, index) => bytes[offset + index] === value);
}

function hasText(bytes: Uint8Array, text: string, offset = 0): boolean {
  return text
    .split("")
    .every(
      (character, index) =>
        bytes[offset + index] === character.charCodeAt(0)
    );
}

function detectImageContentType(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer).subarray(0, 64);
  if (hasBytes(bytes, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    hasBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return "image/png";
  }
  if (hasText(bytes, "GIF8")) return "image/gif";
  if (hasText(bytes, "RIFF") && hasText(bytes, "WEBP", 8)) {
    return "image/webp";
  }
  if (hasText(bytes, "ftyp", 4)) {
    const brands = new TextDecoder("ascii").decode(bytes.subarray(8, 48));
    if (brands.includes("avif") || brands.includes("avis")) {
      return "image/avif";
    }
  }

  return null;
}

function parseAllowedUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ImageProxyError("Invalid image URL", 400);
  }

  const allowedHost = ALLOWED_DOMAINS.some(
    (domain) =>
      url.hostname === domain || url.hostname.endsWith(`.${domain}`)
  );
  if (url.protocol !== "https:" || !allowedHost) {
    throw new ImageProxyError("Image domain is not allowed", 403);
  }

  return url;
}

function isRedirect(response: Response): boolean {
  return [301, 302, 303, 307, 308].includes(response.status);
}

async function fetchAllowedImage(
  initialUrl: URL,
  signal: AbortSignal
): Promise<Response> {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      headers: {
        Accept: "image/jpeg,image/png;q=0.9",
        Referer: "https://www.playstation.com/",
      },
      redirect: "manual",
      signal,
      next: { revalidate: 86400 },
    });

    if (!isRedirect(response)) return response;

    if (redirectCount === MAX_REDIRECTS) {
      throw new ImageProxyError("Too many image redirects", 502);
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new ImageProxyError("Image redirect had no location", 502);
    }

    await response.body?.cancel();
    currentUrl = parseAllowedUrl(new URL(location, currentUrl).toString());
  }

  throw new ImageProxyError("Unable to fetch image", 502);
}

async function readLimitedBody(response: Response): Promise<ArrayBuffer> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
    throw new ImageProxyError("Image is too large", 413);
  }

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new ImageProxyError("Image is too large", 413);
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalLength += value.byteLength;
    if (totalLength > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new ImageProxyError("Image is too large", 413);
    }
    chunks.push(value);
  }

  const buffer = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return buffer.buffer;
}

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("url");
  if (!value) {
    return NextResponse.json(
      { error: "URL is required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    IMAGE_FETCH_TIMEOUT_MS
  );

  try {
    const imageUrl = parseAllowedUrl(value);
    const response = await fetchAllowedImage(imageUrl, controller.signal);
    if (!response.ok) {
      throw new ImageProxyError(
        `Upstream image request failed (${response.status})`,
        response.status >= 400 && response.status < 600
          ? response.status
          : 502
      );
    }

    const buffer = await readLimitedBody(response);
    if (buffer.byteLength === 0) {
      throw new ImageProxyError("Image response was empty", 502);
    }

    const contentType = detectImageContentType(buffer);
    if (!contentType) {
      throw new ImageProxyError(
        "Upstream response was not a supported raster image",
        415
      );
    }

    return new NextResponse(buffer, {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ImageProxyError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: CORS_HEADERS }
      );
    }

    const timedOut = error instanceof Error && error.name === "AbortError";
    console.error("Image proxy error:", error);
    return NextResponse.json(
      { error: timedOut ? "Image request timed out" : "Failed to proxy image" },
      { status: timedOut ? 504 : 500, headers: CORS_HEADERS }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
