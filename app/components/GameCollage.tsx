"use client";

import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { Download, Loader2 } from "lucide-react";
import { toBlob } from "html-to-image";
import type { PlayStationGame } from "@/app/types/playstation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration, gameCoverAspectClass, gameCoverImageHeightClass, gameCoverObjectFit, isPlayed, platformLabel } from "@/lib/playstation";
import PlatformBadge from "@/app/components/PlatformBadge";

interface GameCollageProps {
  games: PlayStationGame[];
  userName?: string;
  psnId?: string;
  userAvatar?: string;
  maxGames?: number;
  periodLabel?: string;
}

const EXPORT_PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#1e293b"/><path d="M128 352l78-86 56 58 42-48 80 76H128z" fill="#475569"/><circle cx="205" cy="185" r="34" fill="#475569"/></svg>'
)}`;

function getExportImageUrl(url: string): string {
  const normalizedUrl = normalizeImageUrl(url);
  if (
    !normalizedUrl ||
    normalizedUrl.startsWith("data:") ||
    normalizedUrl.startsWith("blob:") ||
    normalizedUrl.startsWith("/")
  ) {
    return normalizedUrl;
  }
  return `/api/image-proxy?url=${encodeURIComponent(normalizedUrl)}`;
}

function normalizeImageUrl(url: string): string {
  return url.trim().replace(/^http:\/\//i, "https://");
}

function handleImageError(
  event: SyntheticEvent<HTMLImageElement>,
  originalUrl: string
): void {
  const image = event.currentTarget;

  if (image.dataset.directFallback === "true") {
    image.removeAttribute("crossorigin");
    image.src = EXPORT_PLACEHOLDER;
    return;
  }

  image.dataset.directFallback = "true";
  image.dataset.originalSrc = normalizeImageUrl(originalUrl);
  image.dataset.exportSrc = getExportImageUrl(originalUrl);
  image.removeAttribute("crossorigin");
  image.src = image.dataset.originalSrc;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : EXPORT_PLACEHOLDER);
    reader.onerror = () => reject(reader.error || new Error("Unable to read image data."));
    reader.readAsDataURL(blob);
  });
}

function hasBytes(bytes: Uint8Array, offset: number, values: number[]): boolean {
  return values.every((value, index) => bytes[offset + index] === value);
}

function hasText(bytes: Uint8Array, text: string, offset = 0): boolean {
  return text.split("").every((character, index) => bytes[offset + index] === character.charCodeAt(0));
}

async function getImageMimeType(blob: Blob): Promise<string | null> {
  const declaredType = blob.type.split(";", 1)[0].toLowerCase();
  if (declaredType.startsWith("image/")) return declaredType;

  const bytes = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
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

async function imageBlobToDataUrl(blob: Blob): Promise<string> {
  const mimeType = await getImageMimeType(blob);
  if (!mimeType) return EXPORT_PLACEHOLDER;

  const typedBlob = blob.type.toLowerCase().startsWith("image/")
    ? blob
    : new Blob([await blob.arrayBuffer()], { type: mimeType });
  return blobToDataUrl(typedBlob);
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Robust Image-to-DataURL converter with timeout and fallbacks:
 * Tier 1: Proxy URL fetch
 * Tier 2: Direct URL fetch
 * Tier 3: HTMLImageElement + 2D Canvas render
 * Tier 4: EXPORT_PLACEHOLDER fallback (never throws or breaks export pipeline)
 */
async function urlToDataUrl(originalUrl: string): Promise<string> {
  const normalized = normalizeImageUrl(originalUrl);
  if (!normalized) return EXPORT_PLACEHOLDER;
  if (normalized.startsWith("data:")) return normalized;

  const proxyUrl = getExportImageUrl(normalized);

  // Tier 1: Proxy URL fetch with generous 12s timeout
  try {
    const res = await fetchWithTimeout(proxyUrl, { cache: "force-cache" }, 12000);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) {
        const dataUrl = await imageBlobToDataUrl(blob);
        if (dataUrl && dataUrl !== EXPORT_PLACEHOLDER) return dataUrl;
      }
    }
  } catch {
    // Continue to Tier 1 Retry
  }

  // Tier 1 Retry: Retry Proxy URL fetch with 15s timeout
  try {
    const res = await fetchWithTimeout(proxyUrl, { cache: "default" }, 15000);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) {
        const dataUrl = await imageBlobToDataUrl(blob);
        if (dataUrl && dataUrl !== EXPORT_PLACEHOLDER) return dataUrl;
      }
    }
  } catch {
    // Continue
  }

  // Tier 2: HTMLImageElement + 2D Canvas render via proxy
  try {
    const dataUrl = await imageElementToDataUrl(proxyUrl);
    if (dataUrl && dataUrl !== EXPORT_PLACEHOLDER) return dataUrl;
  } catch {
    // Continue
  }

  // Tier 3: HTMLImageElement + 2D Canvas render via direct URL
  try {
    const dataUrl = await imageElementToDataUrl(normalized);
    if (dataUrl && dataUrl !== EXPORT_PLACEHOLDER) return dataUrl;
  } catch {
    // Continue
  }

  return EXPORT_PLACEHOLDER;
}

function imageElementToDataUrl(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width || 512;
        canvas.height = img.naturalHeight || img.height || 512;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(EXPORT_PLACEHOLDER);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(EXPORT_PLACEHOLDER);
      }
    };
    img.onerror = () => resolve(EXPORT_PLACEHOLDER);
    img.src = src;
  });
}

/**
 * Preloads all cover images and avatar as Data URLs in memory before creating the export DOM.
 * All images start fetching in parallel immediately for fast, reliable first-time export.
 */
async function preloadAllImageDataUrls(
  games: PlayStationGame[],
  userAvatar?: string
): Promise<{ avatarDataUrl: string; coverDataUrls: Record<string, string> }> {
  const coverDataUrls: Record<string, string> = {};

  const avatarPromise = userAvatar ? urlToDataUrl(userAvatar) : Promise.resolve(EXPORT_PLACEHOLDER);

  const coverPromises = games.map(async (game) => {
    if (!game.iconUrl) return;
    const dataUrl = await urlToDataUrl(game.iconUrl);
    if (dataUrl && dataUrl !== EXPORT_PLACEHOLDER) {
      coverDataUrls[game.id] = dataUrl;
    }
  });

  const [avatarDataUrl] = await Promise.all([
    avatarPromise,
    Promise.all(coverPromises),
  ]);

  return { avatarDataUrl, coverDataUrls };
}

/**
 * Builds an independent offscreen 1200px export poster container.
 * Sized at 1200px width (safe for all WebKit/Safari/Chrome canvas limits).
 */
function buildExportPoster(
  topGames: PlayStationGame[],
  avatarDataUrl: string,
  coverDataUrls: Record<string, string>,
  userName?: string,
  psnId?: string,
  userAvatar?: string,
  periodLabel: string = "游戏回顾"
): HTMLElement {
  const container = document.createElement("div");
  container.className = "bg-[#0f172a] text-white p-8 rounded-[32px]";
  container.style.width = "1200px";
  container.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";

  // Header
  const header = document.createElement("div");
  header.className = "flex items-center justify-between gap-6 mb-8 pb-6 border-b border-white/10";

  const userBox = document.createElement("div");
  userBox.className = "flex items-center gap-4 min-w-0";

  if (userAvatar && avatarDataUrl !== EXPORT_PLACEHOLDER) {
    const avatarImg = document.createElement("img");
    avatarImg.src = avatarDataUrl;
    avatarImg.className = "h-14 w-14 rounded-full object-cover border-2 border-white/20 shadow-lg";
    userBox.appendChild(avatarImg);
  } else {
    const fallbackAvatar = document.createElement("div");
    fallbackAvatar.className = "h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-lg";
    fallbackAvatar.textContent = (userName || "P").charAt(0).toUpperCase();
    userBox.appendChild(fallbackAvatar);
  }

  const userDetails = document.createElement("div");
  userDetails.className = "min-w-0";
  const nameP = document.createElement("p");
  nameP.className = "text-xl font-extrabold truncate tracking-tight";
  nameP.textContent = userName || "PlayStation player";
  const psnP = document.createElement("p");
  psnP.className = "text-sm text-white/60 truncate mt-0.5";
  psnP.textContent = psnId || "PSN";
  userDetails.appendChild(nameP);
  userDetails.appendChild(psnP);
  userBox.appendChild(userDetails);

  const statsBox = document.createElement("div");
  statsBox.className = "text-right shrink-0";
  const countP = document.createElement("p");
  countP.className = "text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400";
  countP.textContent = String(topGames.length);
  const periodP = document.createElement("p");
  periodP.className = "text-[11px] font-semibold uppercase tracking-widest text-white/40 mt-1";
  periodP.textContent = periodLabel;
  statsBox.appendChild(countP);
  statsBox.appendChild(periodP);

  header.appendChild(userBox);
  header.appendChild(statsBox);
  container.appendChild(header);

  // Bento Grid (6 Columns, Square 1:1 Tile Units)
  const maxPlaytimeSeconds = topGames[0]?.playtimeSeconds || 0;
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(6, minmax(0, 1fr))";
  grid.style.gap = "16px";
  grid.style.gridAutoRows = "180px";
  grid.style.gridAutoFlow = "dense";

  topGames.forEach((game, index) => {
    const tile = document.createElement("div");
    tile.className = "relative min-w-0 overflow-hidden rounded-2xl bg-slate-800/80 shadow-md flex items-center justify-center";

    // Playtime Size Hierarchy:
    // Top 1: 3x3 Giant Square (or 2x2 if small list)
    // Top 2-4: 2x2 Medium Square
    // Others: 1x1 Standard Square
    const ratio = maxPlaytimeSeconds > 0 ? game.playtimeSeconds / maxPlaytimeSeconds : 0;

    if (index === 0) {
      if (topGames.length >= 7) {
        tile.style.gridColumn = "span 3";
        tile.style.gridRow = "span 3";
      } else {
        tile.style.gridColumn = "span 2";
        tile.style.gridRow = "span 2";
      }
    } else if (index >= 1 && index <= 3 && ratio >= 0.2) {
      tile.style.gridColumn = "span 2";
      tile.style.gridRow = "span 2";
    } else {
      tile.style.gridColumn = "span 1";
      tile.style.gridRow = "span 1";
    }

    const coverDataUrl = coverDataUrls[game.id] || (game.iconUrl ? getExportImageUrl(game.iconUrl) : null);
    if (coverDataUrl) {
      // Pure edge-to-edge square cover image
      const img = document.createElement("img");
      img.src = coverDataUrl;
      img.alt = game.name;
      img.className = "w-full h-full object-cover object-center rounded-2xl";
      tile.appendChild(img);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 text-center";
      const charSpan = document.createElement("span");
      charSpan.className = "text-3xl font-extrabold text-white/80";
      charSpan.textContent = game.name.charAt(0);
      fallback.appendChild(charSpan);
      tile.appendChild(fallback);
    }

    grid.appendChild(tile);
  });

  container.appendChild(grid);
  return container;
}

export default function GameCollage({
  games,
  userName,
  psnId,
  userAvatar,
  maxGames,
  periodLabel = "游戏回顾",
}: GameCollageProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const topGames = useMemo(() => {
    const rankedGames = [...games]
      .filter(isPlayed)
      .sort((a, b) => b.playtimeSeconds - a.playtimeSeconds || b.trophyProgress - a.trophyProgress);
    return maxGames === undefined ? rankedGames : rankedGames.slice(0, maxGames);
  }, [games, maxGames]);

  const downloadCollage = async () => {
    if (topGames.length === 0) return;
    setDownloading(true);
    setDownloadError(null);

    let exportHost: HTMLDivElement | null = null;
    try {
      // 1. Preload ALL images as Data URLs in memory FIRST with 4-tier fallback
      const { avatarDataUrl, coverDataUrls } = await preloadAllImageDataUrls(topGames, userAvatar);

      // 2. Build independent 1200px offscreen poster container using fully loaded Data URLs
      const exportPoster = buildExportPoster(
        topGames,
        avatarDataUrl,
        coverDataUrls,
        userName,
        psnId,
        userAvatar,
        periodLabel
      );

      exportHost = document.createElement("div");
      exportHost.style.position = "fixed";
      exportHost.style.left = "-9999px";
      exportHost.style.top = "-9999px";
      exportHost.style.width = "1200px";
      exportHost.style.zIndex = "-9999";
      exportHost.style.pointerEvents = "none";
      exportHost.appendChild(exportPoster);
      document.body.appendChild(exportHost);

      // Give browser a short tick to process layout
      await wait(100);

      // 3. Render HD PNG Blob (with pixelRatio 2, falling back to 1.5/1.0 if canvas limits hit)
      let blob: Blob | null = null;

      try {
        blob = await toBlob(exportPoster, {
          cacheBust: false,
          pixelRatio: 2,
          backgroundColor: "#0f172a",
          fontEmbedCSS: "",
          imagePlaceholder: EXPORT_PLACEHOLDER,
          onImageErrorHandler: () => undefined,
        });
      } catch (err) {
        console.warn("toBlob pixelRatio 2 failed, trying pixelRatio 1.5:", err);
      }

      if (!blob || blob.size === 0) {
        await wait(150);
        blob = await toBlob(exportPoster, {
          cacheBust: true,
          pixelRatio: 1.5,
          backgroundColor: "#0f172a",
          fontEmbedCSS: "",
          imagePlaceholder: EXPORT_PLACEHOLDER,
          onImageErrorHandler: () => undefined,
        });
      }

      if (!blob || blob.size === 0) {
        blob = await toBlob(exportPoster, {
          cacheBust: true,
          pixelRatio: 1,
          backgroundColor: "#0f172a",
          fontEmbedCSS: "",
          imagePlaceholder: EXPORT_PLACEHOLDER,
          onImageErrorHandler: () => undefined,
        });
      }

      if (!blob || blob.size === 0) {
        throw new Error("拼图生成结果为空，请检查网络或刷新页面后重试。");
      }

      // 4. Trigger direct download
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `playstation-collage-${psnId || "stats"}.png`;
      link.href = objectUrl;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } catch (error) {
      console.error("Unable to export collage:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      setDownloadError(`拼图导出失败: ${errMsg}`);
    } finally {
      exportHost?.remove();
      setDownloading(false);
    }
  };

  if (topGames.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {userAvatar ? (
              <img
                src={getExportImageUrl(userAvatar)}
                alt=""
                className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
                onError={(event) => handleImageError(event, userAvatar)}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                {(userName || "P").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate text-foreground text-sm sm:text-base">{userName || "PlayStation player"}</p>
              <p className="text-xs text-muted-foreground truncate">{psnId || "PSN"}</p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-xl sm:text-2xl font-bold text-foreground">{topGames.length}</p>
            <p className="text-xs font-medium text-muted-foreground">{periodLabel}</p>
          </div>
        </div>

        {/* Dashboard Preview Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {topGames.map((game) => (
            <div
              key={game.id}
              className="group relative flex flex-col items-center justify-center min-w-0 rounded-xl overflow-hidden bg-muted"
            >
              <div className={`${gameCoverAspectClass(game.platform)} relative w-full overflow-hidden bg-muted`}>
                <img
                  src={game.iconUrl || EXPORT_PLACEHOLDER}
                  alt={game.name}
                  className={`w-full ${gameCoverImageHeightClass(game.platform)} ${gameCoverObjectFit(game.platform)} transition-transform group-hover:scale-105`}
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
                  <p className="text-xs font-semibold text-white truncate">{game.name}</p>
                  <div className="flex items-center gap-1 text-[10px] text-white/80 mt-0.5">
                    <PlatformBadge platform={game.platform} className="px-1 py-0 text-[9px] bg-white/20 text-white border-0" />
                    <span>·</span>
                    <span>{game.trophyProgress}%</span>
                    <span>·</span>
                    <span>{formatDuration(game.playtimeSeconds)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={downloadCollage} disabled={downloading} className="gap-2">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading ? "正在生成..." : "导出拼图"}
          </Button>
        </div>

        {downloadError && <p className="text-right text-sm text-destructive font-medium">{downloadError}</p>}
      </CardContent>
    </Card>
  );
}
