import type { PlayStationGame } from "@/app/types/playstation";
import { formatDuration } from "@/lib/playstation";

export interface CollageImageAsset {
  blob: Blob;
  objectUrl: string;
}

export interface CollagePosterResult {
  blob: Blob;
  height: number;
  missingCoverNames: string[];
  pixelRatio: number;
  width: number;
}

interface CollagePosterOptions {
  assets: ReadonlyMap<string, CollageImageAsset>;
  games: PlayStationGame[];
  periodLabel: string;
  gamesLabel?: string;
  noDurationLabel?: string;
  psnId?: string;
  userAvatar?: string;
  userName?: string;
  fallbackPlayer?: string;
  fallbackPsn?: string;
}

interface TilePlacement {
  column: number;
  columnSpan: number;
  game: PlayStationGame;
  row: number;
  rowSpan: number;
}

type DecodedCollageImage = HTMLImageElement | ImageBitmap;

const POSTER_WIDTH = 1200;
const POSTER_PADDING = 32;
const HEADER_HEIGHT = 113;
const GRID_COLUMNS = 6;
const GRID_GAP = 16;
const GRID_ROW_HEIGHT = 180;
const TILE_RADIUS = 16;
const MAX_CANVAS_SIDE = 8192;
const MAX_CANVAS_PIXELS = 24_000_000;
const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

export function normalizeCollageImageUrl(url: string): string {
  return url.trim().replace(/^http:\/\//i, "https://");
}

export function getCollageProxyUrl(url: string): string {
  const normalizedUrl = normalizeCollageImageUrl(url);
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

function getTileSpan(
  games: PlayStationGame[],
  index: number
): { columnSpan: number; rowSpan: number } {
  if (index === 0) {
    const span = games.length >= 7 ? 3 : 2;
    return { columnSpan: span, rowSpan: span };
  }

  const maxPlaytimeSeconds = games[0]?.playtimeSeconds || 0;
  const ratio = maxPlaytimeSeconds > 0
    ? games[index].playtimeSeconds / maxPlaytimeSeconds
    : 0;

  if (index <= 3 && ratio >= 0.2) {
    return { columnSpan: 2, rowSpan: 2 };
  }

  return { columnSpan: 1, rowSpan: 1 };
}

function canPlace(
  occupied: boolean[][],
  row: number,
  column: number,
  rowSpan: number,
  columnSpan: number
): boolean {
  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
      if (occupied[row + rowOffset]?.[column + columnOffset]) return false;
    }
  }

  return true;
}

function occupy(
  occupied: boolean[][],
  row: number,
  column: number,
  rowSpan: number,
  columnSpan: number
): void {
  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    const targetRow = row + rowOffset;
    occupied[targetRow] ||= Array(GRID_COLUMNS).fill(false);
    for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
      occupied[targetRow][column + columnOffset] = true;
    }
  }
}

function placeTiles(games: PlayStationGame[]): {
  placements: TilePlacement[];
  rowCount: number;
} {
  const occupied: boolean[][] = [];
  const placements = games.map((game, index) => {
    const { columnSpan, rowSpan } = getTileSpan(games, index);

    for (let row = 0; ; row += 1) {
      for (
        let column = 0;
        column <= GRID_COLUMNS - columnSpan;
        column += 1
      ) {
        if (!canPlace(occupied, row, column, rowSpan, columnSpan)) continue;

        occupy(occupied, row, column, rowSpan, columnSpan);
        return { column, columnSpan, game, row, rowSpan };
      }
    }
  });

  return {
    placements,
    rowCount: Math.max(1, occupied.length),
  };
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function sourceDimensions(source: DecodedCollageImage): {
  height: number;
  width: number;
} {
  if (source instanceof HTMLImageElement) {
    return {
      height: source.naturalHeight,
      width: source.naturalWidth,
    };
  }

  return {
    height: source.height,
    width: source.width,
  };
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  source: DecodedCollageImage,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const sourceSize = sourceDimensions(source);
  if (sourceSize.width <= 0 || sourceSize.height <= 0) return;

  const sourceRatio = sourceSize.width / sourceSize.height;
  const targetRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = sourceSize.width;
  let sourceHeight = sourceSize.height;

  if (sourceRatio > targetRatio) {
    sourceWidth = sourceSize.height * targetRatio;
    sourceX = (sourceSize.width - sourceWidth) / 2;
  } else {
    sourceHeight = sourceSize.width / targetRatio;
    sourceY = (sourceSize.height - sourceHeight) / 2;
  }

  context.drawImage(
    source,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height
  );
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (context.measureText(text).width <= maxWidth) return text;

  const characters = Array.from(text);
  while (characters.length > 0) {
    characters.pop();
    const candidate = `${characters.join("")}…`;
    if (context.measureText(candidate).width <= maxWidth) return candidate;
  }

  return "…";
}

function drawAvatarFallback(
  context: CanvasRenderingContext2D,
  userName: string | undefined,
  x: number,
  y: number,
  size: number
): void {
  context.save();
  context.fillStyle = "#2563eb";
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = `700 20px ${SYSTEM_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText((userName || "P").charAt(0).toUpperCase(), x + size / 2, y + size / 2);
  context.restore();
}

function drawAvatar(
  context: CanvasRenderingContext2D,
  source: DecodedCollageImage,
  x: number,
  y: number,
  size: number
): void {
  context.save();
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  context.clip();
  drawImageCover(context, source, x, y, size, size);
  context.restore();

  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.2)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size / 2 - 1, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawTileFallback(
  context: CanvasRenderingContext2D,
  game: PlayStationGame,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const gradient = context.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, "#1e293b");
  gradient.addColorStop(1, "#0f172a");
  context.fillStyle = gradient;
  context.fillRect(x, y, width, height);
  context.fillStyle = "rgba(255, 255, 255, 0.8)";
  context.font = `800 30px ${SYSTEM_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(game.name.charAt(0), x + width / 2, y + height / 2);
}

function calculatePixelRatio(width: number, height: number): number {
  const byWidth = MAX_CANVAS_SIDE / width;
  const byHeight = MAX_CANVAS_SIDE / height;
  const byArea = Math.sqrt(MAX_CANVAS_PIXELS / (width * height));
  return Math.min(2, byWidth, byHeight, byArea);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.size > 0) {
        resolve(blob);
      } else {
        reject(new Error("浏览器未能生成 PNG 文件。"));
      }
    }, "image/png");
  });
}

async function decodeAsset(asset: CollageImageAsset): Promise<{
  release: () => void;
  source: DecodedCollageImage;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(asset.blob);
      return {
        release: () => bitmap.close(),
        source: bitmap,
      };
    } catch {
      // Safari can decode an object URL even when createImageBitmap rejects it.
    }
  }

  const image = new Image();
  image.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("图片解码超时。"));
    }, 10_000);
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };
    const handleLoad = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("图片解码失败。"));
    };

    image.addEventListener("load", handleLoad, { once: true });
    image.addEventListener("error", handleError, { once: true });
    image.src = asset.objectUrl;

    if (image.complete) {
      if (image.naturalWidth > 0) handleLoad();
      else handleError();
    }
  });
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    throw new Error("图片解码结果为空。");
  }

  return {
    release: () => {
      image.src = "";
    },
    source: image,
  };
}

export async function renderGameCollagePoster({
  assets,
  games,
  periodLabel,
  gamesLabel = "款游戏",
  noDurationLabel,
  psnId,
  userAvatar,
  userName,
  fallbackPlayer = "PlayStation player",
  fallbackPsn = "PSN",
}: CollagePosterOptions): Promise<CollagePosterResult> {
  if (games.length === 0) {
    throw new Error("没有可导出的游戏。");
  }

  if ("fonts" in document) {
    await document.fonts.ready;
  }

  const { placements, rowCount } = placeTiles(games);
  const totalPlaytimeSeconds = games.reduce(
    (total, game) => total + game.playtimeSeconds,
    0
  );
  const gridHeight =
    rowCount * GRID_ROW_HEIGHT + Math.max(0, rowCount - 1) * GRID_GAP;
  const posterHeight =
    POSTER_PADDING + HEADER_HEIGHT + gridHeight + POSTER_PADDING;
  const pixelRatio = calculatePixelRatio(POSTER_WIDTH, posterHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(POSTER_WIDTH * pixelRatio));
  canvas.height = Math.max(1, Math.floor(posterHeight * pixelRatio));

  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器不支持 Canvas 2D。");

  context.scale(canvas.width / POSTER_WIDTH, canvas.height / posterHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  roundedRectPath(context, 0, 0, POSTER_WIDTH, posterHeight, 32);
  context.fillStyle = "#0f172a";
  context.fill();

  const avatarX = POSTER_PADDING;
  const avatarY = POSTER_PADDING;
  const avatarSize = 56;
  const avatarAsset = userAvatar
    ? assets.get(normalizeCollageImageUrl(userAvatar))
    : undefined;

  if (avatarAsset) {
    try {
      const decodedAvatar = await decodeAsset(avatarAsset);
      try {
        drawAvatar(context, decodedAvatar.source, avatarX, avatarY, avatarSize);
      } finally {
        decodedAvatar.release();
      }
    } catch {
      drawAvatarFallback(context, userName, avatarX, avatarY, avatarSize);
    }
  } else {
    drawAvatarFallback(context, userName, avatarX, avatarY, avatarSize);
  }

  const userTextX = avatarX + avatarSize + 16;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#ffffff";
  context.font = `800 20px ${SYSTEM_FONT}`;
  context.fillText(
    fitText(context, userName || fallbackPlayer, 760),
    userTextX,
    POSTER_PADDING + 24
  );
  context.fillStyle = "rgba(255, 255, 255, 0.6)";
  context.font = `400 14px ${SYSTEM_FONT}`;
  context.fillText(
    fitText(context, psnId || fallbackPsn, 760),
    userTextX,
    POSTER_PADDING + 48
  );

  const rightX = POSTER_WIDTH - POSTER_PADDING;
  const periodGradient = context.createLinearGradient(rightX - 280, 0, rightX, 0);
  periodGradient.addColorStop(0, "#60a5fa");
  periodGradient.addColorStop(1, "#818cf8");
  const exportPeriodLabel = periodLabel.replace(/\s*[·•]\s*/g, " • ");
  const summaryText = `${formatDuration(totalPlaytimeSeconds, noDurationLabel)} • ${games.length} ${gamesLabel}`;
  context.textAlign = "right";
  context.fillStyle = periodGradient;
  context.font = `900 38px ${SYSTEM_FONT}`;
  context.fillText(
    fitText(context, summaryText, 500),
    rightX,
    POSTER_PADDING + 39
  );
  context.fillStyle = "rgba(255, 255, 255, 0.82)";
  context.font = `700 22px ${SYSTEM_FONT}`;
  context.fillText(
    fitText(context, exportPeriodLabel, 280),
    rightX,
    POSTER_PADDING + 75
  );

  const dividerY = POSTER_PADDING + 100;
  context.fillStyle = "rgba(255, 255, 255, 0.1)";
  context.fillRect(POSTER_PADDING, dividerY, POSTER_WIDTH - POSTER_PADDING * 2, 1);

  const gridX = POSTER_PADDING;
  const gridY = POSTER_PADDING + HEADER_HEIGHT;
  const gridWidth = POSTER_WIDTH - POSTER_PADDING * 2;
  const columnWidth =
    (gridWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  const missingCoverNames: string[] = [];

  for (const placement of placements) {
    const x = gridX + placement.column * (columnWidth + GRID_GAP);
    const y = gridY + placement.row * (GRID_ROW_HEIGHT + GRID_GAP);
    const width =
      placement.columnSpan * columnWidth +
      (placement.columnSpan - 1) * GRID_GAP;
    const height =
      placement.rowSpan * GRID_ROW_HEIGHT +
      (placement.rowSpan - 1) * GRID_GAP;

    context.save();
    context.shadowColor = "rgba(0, 0, 0, 0.22)";
    context.shadowBlur = 8;
    context.shadowOffsetY = 4;
    roundedRectPath(context, x, y, width, height, TILE_RADIUS);
    context.fillStyle = "rgba(30, 41, 59, 0.8)";
    context.fill();
    context.restore();

    context.save();
    roundedRectPath(context, x, y, width, height, TILE_RADIUS);
    context.clip();

    const sourceUrl = normalizeCollageImageUrl(placement.game.iconUrl || "");
    const asset = sourceUrl ? assets.get(sourceUrl) : undefined;
    if (asset) {
      try {
        const decodedCover = await decodeAsset(asset);
        try {
          drawImageCover(context, decodedCover.source, x, y, width, height);
        } finally {
          decodedCover.release();
        }
      } catch {
        missingCoverNames.push(placement.game.name);
        drawTileFallback(context, placement.game, x, y, width, height);
      }
    } else {
      if (sourceUrl) missingCoverNames.push(placement.game.name);
      drawTileFallback(context, placement.game, x, y, width, height);
    }

    context.restore();
  }

  const blob = await canvasToBlob(canvas);
  canvas.width = 1;
  canvas.height = 1;

  return {
    blob,
    height: posterHeight,
    missingCoverNames,
    pixelRatio,
    width: POSTER_WIDTH,
  };
}
