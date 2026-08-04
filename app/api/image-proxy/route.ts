import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Allowed domains for image proxying
const ALLOWED_DOMAINS = [
  "image.api.playstation.com",
  "web.np.playstation.com",
  "image.api.np.playstation.com",
  "psnobj.prod.dl.playstation.net",
  "psn-rsc.prod.dl.playstation.net",
  "static-resource.np.community.playstation.net",
];

function hasBytes(bytes: Uint8Array, offset: number, values: number[]): boolean {
  return values.every((value, index) => bytes[offset + index] === value);
}

function hasText(bytes: Uint8Array, text: string, offset = 0): boolean {
  return text.split("").every((character, index) => bytes[offset + index] === character.charCodeAt(0));
}

function detectImageContentType(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer).subarray(0, 512);
  if (hasBytes(bytes, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (hasBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (hasText(bytes, "GIF8")) return "image/gif";
  if (hasText(bytes, "RIFF") && hasText(bytes, "WEBP", 8)) return "image/webp";

  const prefix = new TextDecoder().decode(bytes).trimStart().toLowerCase();
  if (prefix.startsWith("<svg") || (prefix.startsWith("<?xml") && prefix.includes("<svg"))) {
    return "image/svg+xml";
  }

  return null;
}

function resolveImageContentType(header: string | null, buffer: ArrayBuffer): string | null {
  const declaredType = header?.split(";", 1)[0].trim().toLowerCase();
  return declaredType?.startsWith("image/")
    ? declaredType
    : detectImageContentType(buffer);
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const parsedUrl = new URL(url);

    // Check if domain is HTTPS
    if (parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only HTTPS URLs are supported" },
        { status: 400 }
      );
    }

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.playstation.com/",
      },
      redirect: "follow",
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength) {
      return NextResponse.json(
        { error: "Image response was empty" },
        { status: 502 }
      );
    }

    const contentType = resolveImageContentType(
      response.headers.get("content-type"),
      buffer
    );
    if (!contentType) {
      return NextResponse.json(
        { error: "Upstream response was not a recognized image" },
        { status: 415 }
      );
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy image" },
      { status: 500 }
    );
  }
}
