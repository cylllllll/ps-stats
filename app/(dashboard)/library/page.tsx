"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Clock, Database, ExternalLink, Gamepad2, Loader2, RefreshCw, Search, Trophy, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGamesStore } from "@/lib/stores/useGamesStore";
import type { PlayStationGame } from "@/app/types/playstation";
import { formatDate, formatDuration, isPS4Platform, platformLabel } from "@/lib/playstation";
import { useI18n } from "@/lib/i18n";
import PlatformBadge from "@/app/components/PlatformBadge";

type SortField = "name" | "playtime" | "playCount" | "progress" | "lastPlayed";
type SortDirection = "asc" | "desc";

export default function LibraryPage() {
  const { t } = useI18n();
  const games = useGamesStore((state) => state.games);
  const loading = useGamesStore((state) => state.gamesLoading);
  const refreshing = useGamesStore((state) => state.gamesRefreshing);
  const fromCache = useGamesStore((state) => state.gamesFromCache);
  const cacheAge = useGamesStore((state) => state.gamesCacheAge);
  const fetchGames = useGamesStore((state) => state.fetchGames);
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("playtime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredGames = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const result = games.filter((game) =>
      !normalizedQuery || game.name.toLocaleLowerCase().includes(normalizedQuery)
    );

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") comparison = a.name.localeCompare(b.name);
      if (sortField === "playtime") comparison = a.playtimeSeconds - b.playtimeSeconds;
      if (sortField === "playCount") comparison = a.playCount - b.playCount;
      if (sortField === "progress") comparison = a.trophyProgress - b.trophyProgress;
      if (sortField === "lastPlayed") comparison = a.lastPlayedAt - b.lastPlayedAt;
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return result;
  }, [games, query, sortDirection, sortField]);

  const totalPlaytime = games.reduce((sum, game) => sum + game.playtimeSeconds, 0);
  const averageProgress = games.length
    ? games.reduce((sum, game) => sum + game.trophyProgress, 0) / games.length
    : 0;

  const changeSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "name" ? "asc" : "desc");
    }
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t.library.title}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">{t.library.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {fromCache && cacheAge !== null && <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground"><Database className="h-3 w-3" />{Math.round(cacheAge / 60000)} 分钟前缓存</span>}
          <Button variant="outline" size="sm" onClick={() => fetchGames(true)} disabled={refreshing} className="h-8 px-2.5 sm:h-9 sm:px-3"><RefreshCw className={refreshing ? "h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" : "h-3.5 w-3.5 sm:h-4 sm:w-4"} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <SummaryCard icon={<Gamepad2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} label="游戏总数" value={games.length.toLocaleString()} />
        <SummaryCard icon={<Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} label="游玩时长" value={formatDuration(totalPlaytime)} />
        <SummaryCard icon={<Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} label="平均奖杯进度" value={`${averageProgress.toFixed(1)}%`} />
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col md:flex-row gap-2.5 md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.library.searchPlaceholder} className="w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 sm:py-2 text-xs sm:text-sm bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />
              {query && <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>}
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <SortButton field="playtime" activeField={sortField} direction={sortDirection} onClick={changeSort} label={t.library.sortPlaytime} />
              <SortButton field="playCount" activeField={sortField} direction={sortDirection} onClick={changeSort} label={t.library.sortPlayCount} />
              <SortButton field="progress" activeField={sortField} direction={sortDirection} onClick={changeSort} label={t.library.sortProgress} />
              <SortButton field="lastPlayed" activeField={sortField} direction={sortDirection} onClick={changeSort} label={t.library.sortLastPlayed} />
              <SortButton field="name" activeField={sortField} direction={sortDirection} onClick={changeSort} label={t.library.sortName} />
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-2 sm:mt-3">{query ? `找到 ${filteredGames.length} 款游戏` : t.library.gameCount.replace("{count}", String(filteredGames.length))}</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 sm:w-12 px-2 sm:px-4 text-xs">#</TableHead>
                <TableHead className="px-2 sm:px-4 text-xs sm:text-sm">游戏</TableHead>
                <TableHead className="px-2 sm:px-4 text-xs sm:text-sm">奖杯进度</TableHead>
                <TableHead className="hidden sm:table-cell px-4 text-sm">游玩时长</TableHead>
                <TableHead className="hidden md:table-cell px-4 text-sm">启动次数</TableHead>
                <TableHead className="hidden lg:table-cell px-4 text-sm">最近活动</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGames.map((game, index) => (
                <TableRow key={game.id}>
                  <TableCell className="px-2 sm:px-4 text-xs text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      {game.iconUrl ? (
                        <img
                          src={game.iconUrl}
                          alt=""
                          className={
                            isPS4Platform(game.platform)
                              ? "w-9 sm:w-11 h-auto rounded-md object-contain bg-muted/60 shrink-0"
                              : "w-9 h-9 sm:w-11 sm:h-11 rounded-lg object-cover bg-muted shrink-0"
                          }
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate text-xs sm:text-sm max-w-[125px] xs:max-w-[180px] sm:max-w-[260px]">{game.name}</p>
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
                          <PlatformBadge platform={game.platform} />
                          <span className="sm:hidden font-semibold text-foreground">{formatDuration(game.playtimeSeconds)}</span>
                          {game.playCount > 0 && <span className="sm:hidden">({game.playCount}次)</span>}
                          <TrophyCounts game={game} />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 sm:px-4 py-2 sm:py-3"><ProgressCell game={game} /></TableCell>
                  <TableCell className="hidden sm:table-cell px-4 text-sm text-muted-foreground">{formatDuration(game.playtimeSeconds)}</TableCell>
                  <TableCell className="hidden md:table-cell px-4 text-sm text-muted-foreground">{game.playCount > 0 ? `${game.playCount} 次` : "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell px-4 text-sm text-muted-foreground">{formatDate(Math.max(game.lastPlayedAt, game.lastTrophyAt))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filteredGames.length === 0 && <div className="py-12 text-center text-muted-foreground text-xs sm:text-sm">{query ? `没有找到“${query}”` : "暂无游戏数据"}</div>}
      </Card>
    </div>
  );
}

function SummaryCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail?: string }) {
  return <Card><CardContent className="p-2.5 sm:p-4"><div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground text-[10px] sm:text-xs mb-1 sm:mb-2">{icon}{label}</div><p className="text-sm sm:text-2xl font-bold truncate">{value}</p>{detail && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{detail}</p>}</CardContent></Card>;
}

function SortButton({ field, activeField, direction, onClick, label }: { field: SortField; activeField: SortField; direction: SortDirection; onClick: (field: SortField) => void; label: string }) {
  const active = field === activeField;
  return <Button variant={active ? "secondary" : "outline"} size="sm" onClick={() => onClick(field)} className="gap-1 text-xs px-2 h-7 sm:h-8 sm:px-3">{active ? direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}{label}</Button>;
}

function ProgressCell({ game }: { game: PlayStationGame }) {
  const is100 = game.trophyProgress >= 100;
  const color = is100
    ? "platinum-shimmer"
    : game.trophyProgress >= 50
    ? "bg-blue-500"
    : "bg-amber-500";
  return <div className="w-[75px] xs:w-[95px] sm:w-[130px]"><div className="text-[10px] sm:text-xs mb-0.5 sm:mb-1"><span className={is100 ? "font-bold text-slate-700 dark:text-slate-200" : "font-medium"}>{game.trophyProgress}%</span></div><div className="h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, Math.max(0, game.trophyProgress))}%` }} /></div></div>;
}

function TrophyCounts({ game }: { game: PlayStationGame }) {
  return <div className="flex flex-wrap items-center gap-x-2 text-xs"><span className="text-slate-500">{game.earnedTrophies.platinum} 白金</span><span className="text-amber-600">{game.earnedTrophies.gold} 金</span><span className="text-slate-500">{game.earnedTrophies.silver} 银</span><span className="text-orange-600">{game.earnedTrophies.bronze} 铜</span></div>;
}
