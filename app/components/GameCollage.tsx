"use client";

import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { Download, Loader2 } from "lucide-react";
import { toBlob } from "html-to-image";
import type { PlayStationGame } from "@/app/types/playstation";
import { Button } from "@/components/ui/button";
import { formatDuration, gameCoverAspectClass, gameCoverImageHeightClass, gameCoverObjectFit, isPlayed, isPS4Platform, platformLabel } from "@/lib/playstation";

interface GameCollageProps {
  games: PlayStationGame[];
  userName?: string;
  psnId?: string;
  userAvatar?: string;
  maxGames?: number;
  periodLabel?: string;
}

interface CollageGame {
  game: PlayStationGame;
  exportScale: number;
}

interface ExportPlacement {
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
}

const EXPORT_PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#243248"/><path d="M128 352l78-86 56 58 42-48 80 76H128z" fill="#61708a"/><circle cx="205" cy="185" r="34" fill="#61708a"/></svg>'
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

function getExportScale(
  playtimeSeconds: number,
  maxPlaytimeSeconds: number,
  rank: number
): number {
  if (rank === 0) return 1;
  if (rank === 1) return 0.5;
  if (maxPlaytimeSeconds <= 0) return 0.25;
  const ratio = Math.max(0, Math.min(1, playtimeSeconds / maxPlaytimeSeconds));
  return Math.max(0.25, Math.min(0.5, Math.round(Math.sqrt(ratio) * 4) / 4));
}

// Integer grid points that travel clockwise from the top-left corner.
// The first tile is placed explicitly at (0, 0); the remaining points are
// searched in this order so the next tile starts on its right-hand side.
function getSpiralPoints(count: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
  const directions = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
  ];
  let x = 0;
  let y = 0;
  let directionIndex = 0;
  let segmentLength = 1;

  while (points.length < count) {
    for (let segment = 0; segment < 2 && points.length < count; segment += 1) {
      const direction = directions[directionIndex];
      for (let step = 0; step < segmentLength && points.length < count; step += 1) {
        x += direction.x;
        y += direction.y;
        points.push({ x, y });
      }
      directionIndex = (directionIndex + 1) % directions.length;
    }
    segmentLength += 1;
  }

  return points;
}

function placementsOverlap(first: ExportPlacement, second: ExportPlacement): boolean {
  return (
    first.column < second.column + second.columnSpan &&
    second.column < first.column + first.columnSpan &&
    first.row < second.row + second.rowSpan &&
    second.row < first.row + first.rowSpan
  );
}

function getTileSpans(
  collageGame: CollageGame,
  baseSpan: number,
  minimumSpan: number
): { columnSpan: number; rowSpan: number } {
  const squareSpan = Math.max(
    minimumSpan,
    Math.round(collageGame.exportScale * baseSpan)
  );

  if (isPS4Platform(collageGame.game.platform)) {
    // A PS4 cover is rendered as a 2:1 rectangle: at the same scale it uses
    // half the area of a square cover instead of being shrunk in both axes.
    return {
      columnSpan: squareSpan,
      rowSpan: Math.max(1, Math.round(squareSpan / 2)),
    };
  }

  return { columnSpan: squareSpan, rowSpan: squareSpan };
}

function applyExportLayout(
  exportRoot: HTMLElement,
  collageGames: CollageGame[],
  exportWidth: number
): void {
  const grid = exportRoot.querySelector<HTMLElement>("[data-collage-grid]");
  if (!grid) return;

  const columns = exportWidth >= 640 ? 32 : 16;
  const baseSpan = columns / 2;
  const minimumSpan = Math.max(2, Math.round(baseSpan / 4));
  const gap = 8;
  const cellSize = Math.max(12, (exportWidth - gap * (columns - 1)) / columns);
  const spiralPoints = getSpiralPoints(Math.max(1024, collageGames.length * 256));
  const placements: ExportPlacement[] = [];
  const tiles = Array.from(grid.querySelectorAll<HTMLElement>("[data-collage-tile]"));
  let pointIndex = 1;

  collageGames.forEach((collageGame, index) => {
    const { columnSpan, rowSpan } = getTileSpans(
      collageGame,
      baseSpan,
      minimumSpan
    );
    let placement: ExportPlacement | null = null;

    if (index === 0) {
      placement = { column: 0, row: 0, columnSpan, rowSpan };
    } else if (index === 1) {
      // Keep the second-ranked game on the first game's right edge even when
      // the first cover is a shorter PS4 rectangle.
      const firstPlacement = placements[0];
      const rightOfFirst: ExportPlacement = {
        column: firstPlacement.column + firstPlacement.columnSpan,
        row: firstPlacement.row,
        columnSpan,
        rowSpan,
      };
      if (
        rightOfFirst.column + rightOfFirst.columnSpan <= columns &&
        !placements.some((placed) => placementsOverlap(rightOfFirst, placed))
      ) {
        placement = rightOfFirst;
        const pointAtSecond = spiralPoints.findIndex(
          (point) => point.x === rightOfFirst.column && point.y === rightOfFirst.row
        );
        if (pointAtSecond >= 0) pointIndex = pointAtSecond + 1;
      }
    }

    if (!placement) {
      while (pointIndex < spiralPoints.length && !placement) {
        const point = spiralPoints[pointIndex];
        pointIndex += 1;
        const candidate: ExportPlacement = {
          column: point.x,
          row: point.y,
          columnSpan,
          rowSpan,
        };
        if (
          candidate.column >= 0 &&
          candidate.row >= 0 &&
          candidate.column + candidate.columnSpan <= columns &&
          !placements.some((placed) => placementsOverlap(candidate, placed))
        ) {
          placement = candidate;
        }
      }
    }

    if (!placement) {
      const lastRow = placements.reduce(
        (max, placed) => Math.max(max, placed.row + placed.rowSpan),
        0
      );
      placement = {
        column: 0,
        row: lastRow + 1,
        columnSpan: Math.min(columnSpan, columns),
        rowSpan,
      };
    }
    placements.push(placement);
  });

  const rowCount = placements.reduce(
    (max, placement) => Math.max(max, placement.row + placement.rowSpan),
    0
  );

  grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  grid.style.gridAutoRows = `${cellSize}px`;
  grid.style.gridAutoFlow = "row";
  grid.style.gap = `${gap}px`;
  grid.style.height = `${rowCount * cellSize + Math.max(0, rowCount - 1) * gap}px`;

  tiles.forEach((tile, index) => {
    const placement = placements[index];
    if (!placement) return;

    tile.style.gridColumn = `${placement.column + 1} / span ${placement.columnSpan}`;
    tile.style.gridRow = `${placement.row + 1} / span ${placement.rowSpan}`;
    tile.style.height = "100%";

    const coverFrame = tile.querySelector<HTMLElement>("[data-collage-cover-frame]");
    if (coverFrame) {
      coverFrame.style.height = "100%";
      coverFrame.style.aspectRatio = `${placement.columnSpan} / ${placement.rowSpan}`;
    }
  });
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

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      async (image) => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (image.complete && image.naturalWidth > 0) {
            return;
          }

          let startedRetry = false;
          if (
            image.complete &&
            image.naturalWidth === 0 &&
            image.src &&
            !image.src.startsWith("data:")
          ) {
            image.src = addRetryQuery(image.src, attempt + 1);
            startedRetry = true;
          }

          await waitForImageEvent(image, startedRetry);

          // An error can trigger the React fallback and start a second image
          // request. Continue the loop so we wait for that request as well.
          if (image.complete && image.naturalWidth > 0) return;
          if (image.src.startsWith("data:")) return;
        }
      }
    )
  );
}

function waitForImageEvent(image: HTMLImageElement, forceWait = false): Promise<void> {
  if (!forceWait && image.complete) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timeoutId);
      image.removeEventListener("load", finish);
      image.removeEventListener("error", finish);
      resolve();
    };

    const timeoutId = window.setTimeout(finish, 10000);
    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
  });
}

function addRetryQuery(url: string, attempt: number): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}exportRetry=${Date.now()}-${attempt}`;
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
  if (!mimeType) throw new Error("Image response did not contain a recognized image.");

  const typedBlob = blob.type.toLowerCase().startsWith("image/")
    ? blob
    : new Blob([await blob.arrayBuffer()], { type: mimeType });
  return blobToDataUrl(typedBlob);
}

function uniqueImageUrls(urls: Array<string | undefined>): string[] {
  return Array.from(new Set(urls.filter((url): url is string => Boolean(url))));
}

function getImageSourceCandidates(image?: HTMLImageElement): string[] {
  if (!image) return [];

  const originalUrl = image.dataset.originalSrc;
  const currentUrl = image.currentSrc || image.src;
  return uniqueImageUrls([
    image.dataset.exportSrc,
    originalUrl ? getExportImageUrl(originalUrl) : undefined,
    currentUrl.startsWith("data:") ? currentUrl : undefined,
    currentUrl.startsWith("/") ? currentUrl : undefined,
    currentUrl.startsWith("http") ? currentUrl : undefined,
  ]);
}

async function imageToDataUrl(image?: HTMLImageElement): Promise<string> {
  let lastError: unknown;
  for (const sourceUrl of getImageSourceCandidates(image)) {
    if (sourceUrl.startsWith("data:")) return sourceUrl;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(
          attempt === 0 ? sourceUrl : addRetryQuery(sourceUrl, attempt),
          {
            cache: "no-store",
            credentials: "same-origin",
          }
        );
        if (!response.ok) throw new Error(`Image request failed with ${response.status}.`);

        const blob = await response.blob();
        if (!blob.size) throw new Error("Image response was empty.");
        return await imageBlobToDataUrl(blob);
      } catch (error) {
        lastError = error;
        if (attempt < 2) await wait(150 * (attempt + 1));
      }
    }
  }

  console.warn("Unable to inline collage image:", lastError);
  return EXPORT_PLACEHOLDER;
}

async function inlineImages(
  sourceRoot: HTMLElement,
  exportRoot: HTMLElement
): Promise<void> {
  const sourceImages = Array.from(sourceRoot.querySelectorAll("img"));
  const exportImages = Array.from(exportRoot.querySelectorAll("img"));

  await Promise.all(exportImages.map(async (image, index) => {
    image.removeAttribute("crossorigin");
    image.removeAttribute("srcset");
    image.removeAttribute("sizes");
    image.removeAttribute("loading");
    image.onerror = () => {
      image.onerror = null;
      image.src = EXPORT_PLACEHOLDER;
    };
    image.src = await imageToDataUrl(sourceImages[index]);
  }));
}

export default function GameCollage({
  games,
  userName,
  psnId,
  userAvatar,
  maxGames,
  periodLabel = "all titles",
}: GameCollageProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const topGames: CollageGame[] = useMemo(
    () => {
      const rankedGames = [...games]
        .filter(isPlayed)
        .sort(
          (a, b) =>
            b.playtimeSeconds - a.playtimeSeconds ||
            b.trophyProgress - a.trophyProgress
        );
      const visibleGames = maxGames === undefined
        ? rankedGames
        : rankedGames.slice(0, maxGames);
      const maxPlaytimeSeconds = visibleGames[0]?.playtimeSeconds || 0;

      return visibleGames.map((game, index) => ({
        game,
        exportScale: getExportScale(game.playtimeSeconds, maxPlaytimeSeconds, index),
      }));
    },
    [games, maxGames]
  );

  const downloadCollage = async () => {
    const sourceRoot = cardRef.current;
    if (!sourceRoot) return;
    setDownloading(true);
    setDownloadError(null);

    let exportRoot: HTMLElement | null = null;
    let exportHost: HTMLDivElement | null = null;
    try {
      await waitForImages(sourceRoot);

      exportRoot = sourceRoot.cloneNode(true) as HTMLElement;
      const bounds = sourceRoot.getBoundingClientRect();
      exportRoot.style.width = `${bounds.width}px`;
      exportRoot.style.maxWidth = "none";
      exportRoot.setAttribute("aria-hidden", "true");

      exportHost = document.createElement("div");
      exportHost.style.position = "fixed";
      exportHost.style.left = "0";
      exportHost.style.top = "0";
      exportHost.style.width = `${bounds.width}px`;
      exportHost.style.opacity = "0";
      exportHost.style.zIndex = "-1";
      exportHost.style.pointerEvents = "none";
      exportHost.appendChild(exportRoot);
      document.body.appendChild(exportHost);
      const exportGrid = exportRoot.querySelector<HTMLElement>("[data-collage-grid]");
      applyExportLayout(
        exportRoot,
        topGames,
        exportGrid?.getBoundingClientRect().width || bounds.width
      );
      await inlineImages(sourceRoot, exportRoot);
      await waitForImages(exportRoot);

      const blob = await toBlob(exportRoot, {
        cacheBust: false,
        pixelRatio: 2,
        backgroundColor: "#101827",
        imagePlaceholder: EXPORT_PLACEHOLDER,
        onImageErrorHandler: () => undefined,
      });
      if (!blob) throw new Error("The collage image was empty.");

      const objectUrl = URL.createObjectURL(blob);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
      const link = document.createElement("a");
      link.download = "playstation-game-collage.png";
      link.href = objectUrl;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Unable to export collage:", error);
      setDownloadError("拼图导出失败，请稍后重试。");
    } finally {
      exportHost?.remove();
      setDownloading(false);
    }
  };

  if (topGames.length === 0) return null;

  return (
    <div className="space-y-3">
      <div
        ref={cardRef}
        className="rounded-2xl overflow-hidden bg-[#101827] text-white p-5"
      >
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            {userAvatar ? (
              <img
                src={getExportImageUrl(userAvatar)}
                data-export-src={getExportImageUrl(userAvatar)}
                data-original-src={normalizeImageUrl(userAvatar)}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
                onError={(event) => handleImageError(event, userAvatar)}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-blue-500/30 flex items-center justify-center font-semibold">
                {(userName || "P").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate">{userName || "PlayStation player"}</p>
              <p className="text-xs text-white/60 truncate">{psnId || "PSN"} · Trophy journey</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold">{topGames.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/50">{periodLabel}</p>
          </div>
        </div>

        <div data-collage-grid className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {topGames.map(({ game, exportScale }) => (
            <div
              key={game.id}
              data-collage-tile
              data-rectangular={isPS4Platform(game.platform) ? "true" : "false"}
              data-export-scale={exportScale}
              className="relative min-w-0 overflow-hidden rounded-xl bg-white/10"
            >
              <div
                data-collage-cover-frame
                className={`${gameCoverAspectClass(game.platform)} flex w-full items-center justify-center`}
              >
                {game.iconUrl ? (
                  <img
                    src={getExportImageUrl(game.iconUrl)}
                    data-export-src={getExportImageUrl(game.iconUrl)}
                    data-original-src={normalizeImageUrl(game.iconUrl)}
                    alt={game.name}
                    className={`w-full ${gameCoverImageHeightClass(game.platform)} ${gameCoverObjectFit(game.platform)}`}
                    onError={(event) => handleImageError(event, game.iconUrl)}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-blue-900/50 text-2xl font-bold">{game.name.charAt(0)}</div>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-8">
                <p className="text-xs font-semibold truncate">{game.name}</p>
                <p className="text-[10px] text-white/70">{game.trophyProgress}% · {formatDuration(game.playtimeSeconds)} · {platformLabel(game.platform)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={downloadCollage} disabled={downloading} className="gap-2">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          导出拼图
        </Button>
      </div>
      {previewUrl && (
        <div className="space-y-2">
          <p className="text-right text-xs text-muted-foreground">导出预览</p>
          <img src={previewUrl} alt="拼图导出预览" className="w-full rounded-2xl border border-border" />
        </div>
      )}
      {downloadError && <p className="text-right text-sm text-destructive">{downloadError}</p>}
    </div>
  );
}
