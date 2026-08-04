"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Download, Loader2 } from "lucide-react";
import type { PlayStationGame } from "@/app/types/playstation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration, isPlayed } from "@/lib/playstation";
import { interpolate, useI18n } from "@/lib/i18n";
import PlatformBadge from "@/app/components/PlatformBadge";
import {
  getCollageProxyUrl,
  normalizeCollageImageUrl,
  renderGameCollagePoster,
  type CollageImageAsset,
} from "@/app/components/game-collage-export";

interface GameCollageProps {
  games: PlayStationGame[];
  userName?: string;
  psnId?: string;
  userAvatar?: string;
  maxGames?: number;
  periodLabel?: string;
}

interface CollageAssetsState {
  assets: Map<string, CollageImageAsset>;
  failedUrls: Set<string>;
  loading: boolean;
  loadedCount: number;
  sourceSignature: string;
  totalCount: number;
}

const ASSET_CONCURRENCY = 6;
const EMPTY_ASSET_STATE: CollageAssetsState = {
  assets: new Map(),
  failedUrls: new Set(),
  loading: false,
  loadedCount: 0,
  sourceSignature: "",
  totalCount: 0,
};
const EXPORT_PLACEHOLDER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#1e293b"/><path d="M128 352l78-86 56 58 42-48 80 76H128z" fill="#475569"/><circle cx="205" cy="185" r="34" fill="#475569"/></svg>'
)}`;

async function fetchCollageAsset(
  sourceUrl: string,
  signal: AbortSignal
): Promise<Blob> {
  const response = await fetch(getCollageProxyUrl(sourceUrl), {
    cache: "force-cache",
    signal,
  });

  if (!response.ok) {
    throw new Error(`封面请求失败 (${response.status})`);
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.startsWith("image/")) {
    throw new Error("封面响应不是图片");
  }

  const blob = await response.blob();
  if (blob.size === 0) throw new Error("封面响应为空");
  return blob;
}

function useCollageAssets(sourceUrls: string[]) {
  const sourceSignature = useMemo(
    () =>
      Array.from(
        new Set(
          sourceUrls
            .map(normalizeCollageImageUrl)
            .filter(Boolean)
        )
      ).join("\n"),
    [sourceUrls]
  );
  const [retryToken, setRetryToken] = useState(0);
  const [state, setState] = useState<CollageAssetsState>(EMPTY_ASSET_STATE);

  useEffect(() => {
    const urls = sourceSignature ? sourceSignature.split("\n") : [];
    if (urls.length === 0) {
      setState(EMPTY_ASSET_STATE);
      return;
    }

    const controller = new AbortController();
    const assets = new Map<string, CollageImageAsset>();
    const failedUrls = new Set<string>();
    const objectUrls: string[] = [];
    let active = true;
    let completedCount = 0;
    let nextIndex = 0;

    const publish = () => {
      if (!active) return;
      setState({
        assets: new Map(assets),
        failedUrls: new Set(failedUrls),
        loading: completedCount < urls.length,
        loadedCount: assets.size,
        sourceSignature,
        totalCount: urls.length,
      });
    };

    const worker = async () => {
      while (active) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= urls.length) return;

        const sourceUrl = urls[index];
        try {
          const blob = await fetchCollageAsset(sourceUrl, controller.signal);
          if (!active) return;

          const objectUrl = URL.createObjectURL(blob);
          objectUrls.push(objectUrl);
          assets.set(sourceUrl, { blob, objectUrl });
        } catch (error) {
          if (!active || (error instanceof Error && error.name === "AbortError")) {
            return;
          }
          failedUrls.add(sourceUrl);
        } finally {
          if (active) {
            completedCount += 1;
            if (
              completedCount % ASSET_CONCURRENCY === 0 ||
              completedCount === urls.length
            ) {
              publish();
            }
          }
        }
      }
    };

    setState({
      assets: new Map(),
      failedUrls: new Set(),
      loading: true,
      loadedCount: 0,
      sourceSignature,
      totalCount: urls.length,
    });
    void Promise.all(
      Array.from(
        { length: Math.min(ASSET_CONCURRENCY, urls.length) },
        () => worker()
      )
    ).then(publish);

    return () => {
      active = false;
      controller.abort();
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [retryToken, sourceSignature]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, loading: true }));
    setRetryToken((value) => value + 1);
  }, []);

  return {
    ...state,
    loading: state.loading || state.sourceSignature !== sourceSignature,
    retry,
  };
}

function setPlaceholderOnError(image: HTMLImageElement): void {
  if (image.src !== EXPORT_PLACEHOLDER) image.src = EXPORT_PLACEHOLDER;
}

export default function GameCollage({
  games,
  userName,
  psnId,
  userAvatar,
  maxGames,
  periodLabel,
}: GameCollageProps) {
  const { t } = useI18n();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const topGames = useMemo(() => {
    const rankedGames = [...games]
      .filter(isPlayed)
      .sort(
        (a, b) =>
          b.playtimeSeconds - a.playtimeSeconds ||
          b.trophyProgress - a.trophyProgress
      );
    return maxGames === undefined
      ? rankedGames
      : rankedGames.slice(0, maxGames);
  }, [games, maxGames]);

  const assetSources = useMemo(
    () => [
      ...(userAvatar ? [userAvatar] : []),
      ...topGames.map((game) => game.iconUrl).filter(Boolean),
    ],
    [topGames, userAvatar]
  );
  const collageAssets = useCollageAssets(assetSources);

  const failedCoverCount = useMemo(
    () =>
      topGames.filter((game) => {
        const sourceUrl = normalizeCollageImageUrl(game.iconUrl || "");
        return sourceUrl && collageAssets.failedUrls.has(sourceUrl);
      }).length,
    [collageAssets.failedUrls, topGames]
  );

  const downloadCollage = async () => {
    if (topGames.length === 0) return;

    if (failedCoverCount > 0) {
      setDownloadError(
        interpolate(t.collage.coverLoadFailed, { count: failedCoverCount })
      );
      collageAssets.retry();
      return;
    }

    setDownloading(true);
    setDownloadError(null);

    try {
      const result = await renderGameCollagePoster({
        assets: collageAssets.assets,
        games: topGames,
        periodLabel: periodLabel || t.collage.defaultPeriod,
        gamesLabel: t.common.games,
        noDurationLabel: t.common.noDuration,
        psnId,
        userAvatar,
        userName,
        fallbackPlayer: t.collage.fallbackPlayer,
        fallbackPsn: t.collage.fallbackPsn,
      });

      if (result.missingCoverNames.length > 0) {
        const examples = result.missingCoverNames.slice(0, 3).join("、");
        throw new Error(interpolate(t.collage.coverDecodeFailed, {
          count: result.missingCoverNames.length,
          examples,
          suffix: result.missingCoverNames.length > 3 ? "…" : "",
        }));
      }

      const objectUrl = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.download = `playstation-collage-${psnId || "stats"}.png`;
      link.href = objectUrl;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    } catch (error) {
      console.error("Unable to export collage:", error);
      const message = error instanceof Error ? error.message : String(error);
      setDownloadError(interpolate(t.collage.exportFailed, { message }));
    } finally {
      setDownloading(false);
    }
  };

  if (topGames.length === 0) return null;

  const avatarAsset = userAvatar
    ? collageAssets.assets.get(normalizeCollageImageUrl(userAvatar))
    : undefined;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {avatarAsset ? (
              <img
                src={avatarAsset.objectUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
                onError={(event) => setPlaceholderOnError(event.currentTarget)}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                {(userName || "P").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate text-foreground text-sm sm:text-base">
                {userName || t.collage.fallbackPlayer}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {psnId || t.collage.fallbackPsn}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {topGames.length}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              {periodLabel || t.collage.defaultPeriod}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {topGames.map((game) => {
            const coverAsset = game.iconUrl
              ? collageAssets.assets.get(
                  normalizeCollageImageUrl(game.iconUrl)
                )
              : undefined;

            return (
              <div
                key={game.id}
                className="group relative flex flex-col items-center justify-center min-w-0 rounded-xl overflow-hidden bg-muted"
              >
                <div className="aspect-square relative w-full overflow-hidden bg-muted">
                  <img
                    src={coverAsset?.objectUrl || EXPORT_PLACEHOLDER}
                    alt={game.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="eager"
                    onError={(event) =>
                      setPlaceholderOnError(event.currentTarget)
                    }
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
                    <p className="text-xs font-semibold text-white truncate">
                      {game.name}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-white/80 mt-0.5">
                      <PlatformBadge
                        platform={game.platform}
                        className="px-1 py-0 text-[9px] bg-white/20 text-white border-0"
                      />
                      <span>·</span>
                      <span>{game.trophyProgress}%</span>
                      <span>·</span>
                      <span>{formatDuration(game.playtimeSeconds, t.common.noDuration)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCollage}
            disabled={downloading || collageAssets.loading}
            className="gap-2"
          >
            {downloading || collageAssets.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading
              ? t.collage.generating
              : collageAssets.loading
                ? interpolate(t.collage.loadingAssets, { loaded: collageAssets.loadedCount, total: collageAssets.totalCount })
                : failedCoverCount > 0
                  ? t.collage.retryCovers
                  : t.collage.export}
          </Button>
        </div>

        {downloadError && (
          <p className="text-right text-sm text-destructive font-medium">
            {downloadError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
