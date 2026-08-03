"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Clock, Database, ExternalLink, Gamepad2, Loader2, RefreshCw, Search, Trophy, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGamesStore } from "@/lib/stores/useGamesStore";
import type { PlayStationGame } from "@/app/types/playstation";
import { formatDate, formatDuration, gameCoverAspectClass, gameCoverFixedHeightClass, gameCoverImageHeightClass, gameCoverObjectFit, platformLabel } from "@/lib/playstation";
import { useI18n } from "@/lib/i18n";

type SortField = "name" | "playtime" | "progress" | "lastPlayed";
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
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t.library.title}</h1>
          <p className="text-muted-foreground mt-1">{t.library.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {fromCache && cacheAge !== null && <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground"><Database className="h-3 w-3" />{Math.round(cacheAge / 60000)} 分钟前缓存</span>}
          <Button variant="outline" size="sm" onClick={() => fetchGames(true)} disabled={refreshing}><RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <SummaryCard icon={<Gamepad2 className="h-4 w-4" />} label="游戏总数" value={games.length.toLocaleString()} />
        <SummaryCard icon={<Clock className="h-4 w-4" />} label="游玩时长" value={formatDuration(totalPlaytime)} />
        <SummaryCard icon={<Trophy className="h-4 w-4" />} label="平均奖杯进度" value={`${averageProgress.toFixed(1)}%`} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.library.searchPlaceholder} className="w-full pl-9 pr-8 py-2 text-sm bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50" />
              {query && <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="h-4 w-4" /></button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <SortButton field="playtime" activeField={sortField} direction={sortDirection} onClick={changeSort} label={t.library.sortPlaytime} />
              <SortButton field="progress" activeField={sortField} direction={sortDirection} onClick={changeSort} label={t.library.sortProgress} />
              <SortButton field="lastPlayed" activeField={sortField} direction={sortDirection} onClick={changeSort} label={t.library.sortLastPlayed} />
              <SortButton field="name" activeField={sortField} direction={sortDirection} onClick={changeSort} label={t.library.sortName} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{query ? `找到 ${filteredGames.length} 款游戏` : t.library.gameCount.replace("{count}", String(filteredGames.length))}</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>游戏</TableHead>
                <TableHead className="hidden md:table-cell">平台</TableHead>
                <TableHead>奖杯进度</TableHead>
                <TableHead className="hidden sm:table-cell">游玩时长</TableHead>
                <TableHead className="hidden lg:table-cell">最近活动</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGames.map((game, index) => (
                <TableRow key={game.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-[220px]">
                      {game.iconUrl ? <img src={game.iconUrl} alt="" className={`w-12 ${gameCoverFixedHeightClass(game.platform, "h-12")} rounded-lg ${gameCoverObjectFit(game.platform)} bg-muted`} loading="lazy" /> : <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center"><Gamepad2 className="h-5 w-5 text-muted-foreground" /></div>}
                      <div className="min-w-0"><p className="font-medium truncate max-w-[260px]">{game.name}</p><div className="flex flex-wrap items-center gap-x-2"><span className="text-[10px] text-muted-foreground">{platformLabel(game.platform)}</span><TrophyCounts game={game} /></div></div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="secondary">{platformLabel(game.platform)}</Badge></TableCell>
                  <TableCell><ProgressCell game={game} /></TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDuration(game.playtimeSeconds)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDate(Math.max(game.lastPlayedAt, game.lastTrophyAt))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filteredGames.length === 0 && <div className="py-12 text-center text-muted-foreground">{query ? `没有找到“${query}”` : "暂无游戏数据"}</div>}
      </Card>

      {filteredGames.length > 0 && <div className="grid md:grid-cols-3 gap-4">{filteredGames.slice(0, 3).map((game, index) => <GameSummary key={game.id} game={game} rank={index + 1} />)}</div>}
    </div>
  );
}

function SummaryCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail?: string }) {
  return <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">{icon}{label}</div><p className="text-xl sm:text-2xl font-bold truncate">{value}</p>{detail && <p className="text-xs text-muted-foreground mt-1">{detail}</p>}</CardContent></Card>;
}

function SortButton({ field, activeField, direction, onClick, label }: { field: SortField; activeField: SortField; direction: SortDirection; onClick: (field: SortField) => void; label: string }) {
  const active = field === activeField;
  return <Button variant={active ? "secondary" : "outline"} size="sm" onClick={() => onClick(field)} className="gap-1">{active ? direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}{label}</Button>;
}

function ProgressCell({ game }: { game: PlayStationGame }) {
  const color = game.trophyProgress >= 100 ? "bg-emerald-500" : game.trophyProgress >= 50 ? "bg-blue-500" : "bg-amber-500";
  return <div className="min-w-[130px]"><div className="text-xs mb-1"><span className="font-medium">{game.trophyProgress}%</span></div><div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, Math.max(0, game.trophyProgress))}%` }} /></div></div>;
}

function TrophyCounts({ game }: { game: PlayStationGame }) {
  return <div className="flex flex-wrap items-center gap-x-2 text-xs"><span className="text-slate-500">{game.earnedTrophies.platinum} 白金</span><span className="text-amber-600">{game.earnedTrophies.gold} 金</span><span className="text-slate-500">{game.earnedTrophies.silver} 银</span><span className="text-orange-600">{game.earnedTrophies.bronze} 铜</span></div>;
}

function GameSummary({ game, rank }: { game: PlayStationGame; rank: number }) {
  return <Card className="overflow-hidden"><CardHeader className="p-0"><div className={`${gameCoverAspectClass(game.platform)} flex items-center justify-center bg-muted relative`}><img src={game.iconUrl} alt="" className={`w-full ${gameCoverImageHeightClass(game.platform)} ${gameCoverObjectFit(game.platform)} opacity-80`} /><div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" /><span className="absolute left-3 bottom-2 text-white text-xs font-medium">#{rank} · {game.name}</span></div></CardHeader><CardContent className="p-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-muted-foreground text-xs">奖杯进度</p><p className="font-semibold">{game.trophyProgress}%</p></div><div><p className="text-muted-foreground text-xs">游玩时长</p><p className="font-semibold">{formatDuration(game.playtimeSeconds)}</p></div><div><p className="text-muted-foreground text-xs">平台</p><p className="font-semibold">{platformLabel(game.platform)}</p></div><div className="col-span-2"><p className="text-muted-foreground text-xs mb-1">奖杯数量</p><TrophyCounts game={game} /></div><a className="flex items-center gap-1 text-primary text-xs self-end" href={`https://store.playstation.com/search/${encodeURIComponent(game.name)}`} target="_blank" rel="noreferrer">查看商店 <ExternalLink className="h-3 w-3" /></a></CardContent></Card>;
}
