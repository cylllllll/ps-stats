"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Gamepad2, Search, Trophy, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGamesStore } from "@/lib/stores/useGamesStore";
import { formatDuration, hasTrophyData, platformLabel } from "@/lib/playstation";
import PlatformBadge from "@/app/components/PlatformBadge";

type FilterType = "all" | "completed" | "progress" | "not_started";

export default function TrophiesPage() {
  const games = useGamesStore((state) => state.games);
  const trophyGames = useMemo(() => games.filter(hasTrophyData), [games]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredGames = useMemo(() => trophyGames.filter((game) => {
    const matchesQuery = !query.trim() || game.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const matchesFilter = filter === "all" || (filter === "completed" && game.trophyProgress >= 100) || (filter === "progress" && game.trophyProgress > 0 && game.trophyProgress < 100) || (filter === "not_started" && game.trophyProgress === 0);
    return matchesQuery && matchesFilter;
  }).sort((a, b) => b.trophyProgress - a.trophyProgress), [filter, query, trophyGames]);

  const completed = trophyGames.filter((game) => game.trophyProgress >= 100).length;
  const inProgress = trophyGames.filter((game) => game.trophyProgress > 0 && game.trophyProgress < 100).length;
  const notStarted = trophyGames.filter((game) => game.trophyProgress === 0).length;

  return <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6"><div><h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6" />奖杯进度</h1><p className="text-muted-foreground">浏览每款游戏的奖杯完成情况</p></div><div className="grid grid-cols-3 gap-3"><Summary icon={<CheckCircle2 className="h-5 w-5" />} value={completed} label="已完成" color="text-slate-600 dark:text-slate-300" /><Summary icon={<Clock className="h-5 w-5" />} value={inProgress} label="进行中" color="text-blue-600" /><Summary icon={<Gamepad2 className="h-5 w-5" />} value={notStarted} label="未开始" color="text-amber-600" /></div><div className="flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索游戏…" className="w-full pl-9 pr-8 py-2 text-sm bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />{query && <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="h-4 w-4" /></button>}</div><div className="flex flex-wrap gap-2"><FilterButton active={filter === "all"} onClick={() => setFilter("all")}>全部</FilterButton><FilterButton active={filter === "completed"} onClick={() => setFilter("completed")}>已完成</FilterButton><FilterButton active={filter === "progress"} onClick={() => setFilter("progress")}>进行中</FilterButton><FilterButton active={filter === "not_started"} onClick={() => setFilter("not_started")}>未开始</FilterButton></div></div><div className="space-y-3">{filteredGames.map((game) => <Card key={game.id} className="overflow-hidden"><CardContent className="p-4 flex gap-4 items-center"><img src={game.iconUrl} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover bg-muted shrink-0" loading="lazy" /><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold truncate">{game.name}</h3><div className="flex flex-wrap items-center gap-2 mt-1"><PlatformBadge platform={game.platform} /><span className="text-xs text-muted-foreground">{formatDuration(game.playtimeSeconds)}</span><span className="text-xs text-muted-foreground">·</span><span className="text-xs text-muted-foreground">{game.playCount > 0 ? `启动 ${game.playCount} 次` : "暂无启动次数"}</span></div></div><span className={`text-lg font-bold shrink-0 ${game.trophyProgress >= 100 ? "text-slate-700 dark:text-slate-200" : "text-primary"}`}>{game.trophyProgress}%</span></div><div className="mt-3 h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${game.trophyProgress >= 100 ? "platinum-shimmer" : "bg-primary"}`} style={{ width: `${game.trophyProgress}%` }} /></div><p className="text-xs text-muted-foreground mt-2">{game.earnedTrophies.bronze} 铜 · {game.earnedTrophies.silver} 银 · {game.earnedTrophies.gold} 金 · {game.earnedTrophies.platinum} 白金</p></div></CardContent></Card>)}</div>{filteredGames.length === 0 && <div className="text-center py-12 text-muted-foreground">没有匹配的游戏。</div>}</div>;
}

function Summary({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return <div className="bg-card border rounded-lg p-4 text-center"><div className={`flex items-center justify-center gap-2 ${color} mb-1`}>{icon}<span className="text-2xl font-bold">{value}</span></div><p className="text-sm text-muted-foreground">{label}</p></div>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button variant={active ? "default" : "outline"} size="sm" onClick={onClick} className="gap-1">{children}</Button>;
}
