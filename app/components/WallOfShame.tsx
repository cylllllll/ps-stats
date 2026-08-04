"use client";

import { useMemo, useState } from "react";
import { Dices, Gamepad2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayStationGame } from "@/app/types/playstation";
import { formatDuration, gameCoverAspectClass, gameCoverImageHeightClass, gameCoverObjectFit, incompleteTrophyGames, platformLabel } from "@/lib/playstation";

export default function WallOfShame({ games }: { games: PlayStationGame[] }) {
  const candidates = useMemo(() => incompleteTrophyGames(games).sort((a, b) => a.trophyProgress - b.trophyProgress || b.playtimeSeconds - a.playtimeSeconds), [games]);
  const highestProgress = candidates.reduce((max, game) => Math.max(max, game.trophyProgress), 0);
  const [randomGame, setRandomGame] = useState<PlayStationGame | null>(candidates[0] || null);

  const spin = () => {
    if (!candidates.length) return;
    setRandomGame(candidates[Math.floor(Math.random() * candidates.length)]);
  };

  return <div className="space-y-6"><div className="grid grid-cols-2 md:grid-cols-3 gap-4"><Stat title="未满奖杯游戏" value={String(candidates.length)} icon={<Trophy className="h-4 w-4" />} /><Stat title="0% 进度" value={String(candidates.filter((game) => game.trophyProgress === 0).length)} icon={<Gamepad2 className="h-4 w-4" />} /><Stat title="最高待完成进度" value={`${highestProgress}%`} icon={<Dices className="h-4 w-4" />} /></div><Card className="overflow-hidden border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30"><CardHeader className="text-center"><CardTitle className="flex items-center justify-center gap-2"><Dices className="h-5 w-5 text-amber-600 dark:text-amber-400" />抽一款继续完成</CardTitle><p className="text-sm text-muted-foreground">只使用 PSN 返回的未完成奖杯记录；同一游戏已有完成版本时不重复计入。</p></CardHeader><CardContent className="flex flex-col items-center gap-5">{randomGame ? <div className="w-full max-w-md rounded-2xl overflow-hidden bg-white dark:bg-card border shadow-sm"><div className={`${gameCoverAspectClass(randomGame.platform)} flex items-center justify-center bg-muted`}><img src={randomGame.iconUrl} alt={randomGame.name} className={`w-full ${gameCoverImageHeightClass(randomGame.platform)} ${gameCoverObjectFit(randomGame.platform)}`} /></div><div className="p-5 text-center"><h3 className="text-xl font-bold">{randomGame.name}</h3><div className="flex justify-center gap-2 mt-2"><Badge variant="secondary">{randomGame.trophyProgress}% 奖杯</Badge><Badge variant="outline">{platformLabel(randomGame.platform)}</Badge></div><p className="text-sm text-muted-foreground mt-3">已游玩 {formatDuration(randomGame.playtimeSeconds)}</p></div></div> : <p className="text-muted-foreground py-8">恭喜，所有游戏都已完成！</p>}<Button onClick={spin} disabled={!candidates.length} className="gap-2"><Dices className="h-4 w-4" />再抽一次</Button></CardContent></Card><Card><CardHeader><CardTitle className="text-base">待完成游戏</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">{candidates.map((game) => <div key={game.id} className="group relative flex items-center justify-center"><div className={`${gameCoverAspectClass(game.platform)} relative w-full overflow-hidden rounded-xl bg-muted`}><img src={game.iconUrl} alt={game.name} className={`w-full ${gameCoverAspectClass(game.platform)} ${gameCoverObjectFit(game.platform)} transition-transform group-hover:scale-105`} /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pt-8 pb-2"><p className="text-white text-xs font-medium truncate">{game.name}</p><p className="text-white/70 text-[10px]">{platformLabel(game.platform)} · {game.trophyProgress}% · {formatDuration(game.playtimeSeconds)}</p></div></div></div>)}</div></CardContent></Card></div>;
}

function Stat({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">{icon}{title}</div><p className="text-2xl font-bold">{value}</p></CardContent></Card>;
}
