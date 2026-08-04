"use client";

import { useMemo, useState } from "react";
import { Dices, Gamepad2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayStationGame } from "@/app/types/playstation";
import { formatDuration, incompleteTrophyGames } from "@/lib/playstation";
import { interpolate, useI18n } from "@/lib/i18n";
import PlatformBadge from "@/app/components/PlatformBadge";

export default function WallOfShame({ games }: { games: PlayStationGame[] }) {
  const { t } = useI18n();
  const candidates = useMemo(
    () => incompleteTrophyGames(games).sort((a, b) => a.trophyProgress - b.trophyProgress || b.playtimeSeconds - a.playtimeSeconds),
    [games]
  );
  const highestProgress = candidates.reduce((max, game) => Math.max(max, game.trophyProgress), 0);
  const [randomGame, setRandomGame] = useState<PlayStationGame | null>(candidates[0] || null);

  const spin = () => {
    if (!candidates.length) return;
    setRandomGame(candidates[Math.floor(Math.random() * candidates.length)]);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat title={t.shame.unfinishedGames} value={String(candidates.length)} icon={<Trophy className="h-4 w-4" />} />
        <Stat title={t.shame.zeroProgress} value={String(candidates.filter((game) => game.trophyProgress === 0).length)} icon={<Gamepad2 className="h-4 w-4" />} />
        <Stat title={t.shame.highestProgress} value={`${highestProgress}%`} icon={<Dices className="h-4 w-4" />} />
      </div>

      <Card className="overflow-hidden border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Dices className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            {t.shame.drawTitle}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t.shame.drawDescription}</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5">
          {randomGame ? (
            <div className="w-full max-w-md rounded-2xl overflow-hidden bg-white dark:bg-card border shadow-sm">
              <div className="aspect-square flex items-center justify-center bg-muted">
                <img src={randomGame.iconUrl} alt={randomGame.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-5 text-center">
                <h3 className="text-xl font-bold">{randomGame.name}</h3>
                <div className="flex justify-center items-center gap-2 mt-2">
                  <Badge variant="secondary">{randomGame.trophyProgress}% {t.common.trophy}</Badge>
                  <PlatformBadge platform={randomGame.platform} badgeVariant="outline" />
                </div>
                <p className="text-sm text-muted-foreground mt-3">{interpolate(t.shame.played, { duration: formatDuration(randomGame.playtimeSeconds, t.common.noDuration) })}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground py-8">{t.shame.congratulations}</p>
          )}
          <Button onClick={spin} disabled={!candidates.length} className="gap-2"><Dices className="h-4 w-4" />{t.shame.drawAgain}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t.shame.listTitle}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {candidates.map((game) => (
              <div key={game.id} className="group relative flex items-center justify-center">
                <div className="aspect-square relative w-full overflow-hidden rounded-xl bg-muted">
                  <img src={game.iconUrl} alt={game.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pt-8 pb-2">
                    <p className="text-white text-xs font-medium truncate">{game.name}</p>
                    <div className="flex flex-wrap items-center gap-1 text-white/70 text-[10px]">
                      <PlatformBadge platform={game.platform} className="px-1 py-0 text-[9px] bg-white/20 text-white border-0" />
                      <span>·</span><span>{game.trophyProgress}%</span><span>·</span><span>{formatDuration(game.playtimeSeconds, t.common.noDuration)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">{icon}{title}</div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
