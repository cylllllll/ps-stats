"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Clock, Gamepad2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayStationGame } from "@/app/types/playstation";
import { activityTimestamp, formatDate, formatDuration, gameCoverAspectClass, gameCoverFixedHeightClass, gameCoverObjectFit, platformLabel } from "@/lib/playstation";

interface GameTimelineProps {
  games: PlayStationGame[];
}

interface TimelineGroup {
  label: string;
  games: PlayStationGame[];
}

const RECENT_GROUPS = [
  { label: "今天", max: 1 },
  { label: "昨天", max: 2 },
  { label: "本周", max: 7 },
  { label: "本月", max: 30 },
  { label: "最近三个月", max: 90 },
];

export default function GameTimeline({ games }: GameTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const [nowTimestamp] = useState(() => Date.now() / 1000);
  const { groups, recent, forgotten, onThisDay } = useMemo(() => {
    const now = nowTimestamp;
    const currentYear = new Date(now * 1000).getFullYear();
    const activeGames = games.filter((game) => activityTimestamp(game) > 0).sort((a, b) => activityTimestamp(b) - activityTimestamp(a));
    const groups: TimelineGroup[] = [];
    const currentYearGames = activeGames.filter((game) => new Date(activityTimestamp(game) * 1000).getFullYear() === currentYear);

    RECENT_GROUPS.forEach((group, index) => {
      const min = index === 0 ? 0 : RECENT_GROUPS[index - 1].max;
      const selected = currentYearGames.filter((game) => {
        const days = (now - activityTimestamp(game)) / 86_400;
        return index === 0 ? days < 1 : days >= min && days < group.max;
      });
      if (selected.length) groups.push({ label: group.label, games: selected });
    });

    const thisYear = currentYearGames.filter((game) => {
      const days = (now - activityTimestamp(game)) / 86_400;
      return days >= RECENT_GROUPS[RECENT_GROUPS.length - 1].max;
    });
    if (thisYear.length) groups.push({ label: "今年", games: thisYear });

    const olderByYear = new Map<number, PlayStationGame[]>();
    activeGames.forEach((game) => {
      const year = new Date(activityTimestamp(game) * 1000).getFullYear();
      if (year >= currentYear) return;
      const yearGames = olderByYear.get(year) || [];
      yearGames.push(game);
      olderByYear.set(year, yearGames);
    });
    Array.from(olderByYear.entries())
      .sort(([yearA], [yearB]) => yearB - yearA)
      .forEach(([year, yearGames]) => groups.push({ label: `${year}年`, games: yearGames }));

    const recent = activeGames.filter((game) => now - activityTimestamp(game) < 7 * 86_400).sort((a, b) => b.playtimeSeconds - a.playtimeSeconds).slice(0, 5);
    const forgotten = activeGames.filter((game) => now - activityTimestamp(game) > 365 * 86_400 && game.trophyProgress > 0 && game.trophyProgress < 100).sort((a, b) => b.trophyProgress - a.trophyProgress).slice(0, 5);
    const today = new Date();
    const onThisDay = activeGames.filter((game) => {
      const date = new Date(activityTimestamp(game) * 1000);
      return date.getMonth() === today.getMonth() && Math.abs(date.getDate() - today.getDate()) <= 2 && date.getFullYear() < today.getFullYear();
    }).slice(0, 6);

    return { groups, recent, forgotten, onThisDay };
  }, [games, nowTimestamp]);

  return (
    <div className="space-y-6">
      {onThisDay.length > 0 && <Card className="border-primary/20 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />历史上的今天</CardTitle><CardDescription>往年这个时候，你的 PSN 活动记录里出现过这些游戏</CardDescription></CardHeader><CardContent><GameList games={onThisDay} /></CardContent></Card>}

      <div className="grid md:grid-cols-2 gap-6">
        <ActivityCard title="最近活跃" description="过去一周有游玩或奖杯活动的游戏" icon={<Gamepad2 className="h-4 w-4" />} games={recent} empty="暂无最近活动" />
        <ActivityCard title="被搁置的游戏" description="一年以上没有活动，但仍有奖杯进度" icon={<Clock className="h-4 w-4" />} games={forgotten} empty="暂无被搁置的游戏" />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" />活动时间线</CardTitle><CardDescription>按最近游玩或奖杯解锁时间整理</CardDescription></CardHeader>
        <CardContent>
          {groups.length === 0 ? <p className="text-center text-muted-foreground py-10">PSN 没有返回活动时间。</p> : <div className="relative"><div className="absolute left-4 top-0 bottom-0 w-px bg-border" /><div className="space-y-6">{(showAll ? groups : groups.slice(0, 4)).map((group, index) => <div key={group.label} className="relative pl-10"><div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-background ${index === 0 ? "bg-primary" : "bg-muted-foreground/50"}`} /><h3 className="font-medium text-sm mb-3 flex items-center gap-2">{group.label}<Badge variant="secondary" className="text-xs">{group.games.length}</Badge></h3><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">{group.games.slice(0, 12).map((game, gameIndex) => <GameTile key={`${game.id}-${gameIndex}`} game={game} />)}{group.games.length > 12 && <div className="flex items-center justify-center bg-muted rounded-lg text-muted-foreground text-sm">+{group.games.length - 12}</div>}</div></div>)}</div>{groups.length > 4 && <div className="mt-6 text-center"><Button variant="outline" size="sm" onClick={() => setShowAll((value) => !value)} className="gap-2">{showAll ? <><ChevronUp className="h-4 w-4" />收起</> : <><ChevronDown className="h-4 w-4" />显示更多</>}</Button></div>}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityCard({ title, description, icon, games, empty }: { title: string; description: string; icon: React.ReactNode; games: PlayStationGame[]; empty: string }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{games.length ? <GameList games={games} /> : <p className="text-sm text-muted-foreground py-4">{empty}</p>}</CardContent></Card>;
}

function GameList({ games }: { games: PlayStationGame[] }) {
  return <div className="space-y-3">{games.map((game, index) => <div key={`${game.id}-${index}`} className="flex items-center gap-3"><img src={game.iconUrl} alt="" className={`w-10 ${gameCoverFixedHeightClass(game.platform, "h-10")} rounded ${gameCoverObjectFit(game.platform)} bg-muted`} /><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{game.name}</p><p className="text-xs text-muted-foreground">{platformLabel(game.platform)} · {game.trophyProgress}% 奖杯 · {formatDuration(game.playtimeSeconds)}</p></div><Badge variant="outline" className="text-xs shrink-0">{formatDate(activityTimestamp(game))}</Badge></div>)}</div>;
}

function GameTile({ game }: { game: PlayStationGame }) {
  return <div className="group relative flex items-center justify-center"><img src={game.iconUrl} alt={game.name} className={`w-full ${gameCoverAspectClass(game.platform)} ${gameCoverObjectFit(game.platform)} rounded-lg transition-transform group-hover:scale-105 bg-muted`} /><div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2"><div><p className="text-white text-xs font-medium line-clamp-1">{game.name}</p><p className="text-white/70 text-[10px]">{platformLabel(game.platform)} · {formatDate(activityTimestamp(game))} · {game.trophyProgress}%</p></div></div></div>;
}
