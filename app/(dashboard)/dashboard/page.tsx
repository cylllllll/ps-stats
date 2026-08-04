"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  Database,
  Gamepad2,
  Loader2,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGamesStore } from "@/lib/stores/useGamesStore";
import { formatDate, formatDuration, gameCoverAspectClass, gameCoverImageHeightClass, gameCoverObjectFit, incompleteTrophyGames, isPlayed, isPlayedInYear, platformLabel } from "@/lib/playstation";
import GameCollage from "@/app/components/GameCollage";
import PlatformBadge from "@/app/components/PlatformBadge";

export default function DashboardPage() {
  const games = useGamesStore((state) => state.games);
  const profile = useGamesStore((state) => state.profile);
  const psnId = useGamesStore((state) => state.psnId);
  const loading = useGamesStore((state) => state.gamesLoading);
  const refreshing = useGamesStore((state) => state.gamesRefreshing);
  const fromCache = useGamesStore((state) => state.gamesFromCache);
  const cacheAge = useGamesStore((state) => state.gamesCacheAge);
  const error = useGamesStore((state) => state.gamesError);
  const fetchGames = useGamesStore((state) => state.fetchGames);

  const currentYear = new Date().getFullYear();
  const overviewGames = games.filter((game) => isPlayedInYear(game, currentYear));
  const playedGames = overviewGames.filter(isPlayed);
  const incompleteGames = incompleteTrophyGames(games);
  const totalPlaytime = overviewGames.reduce((sum, game) => sum + game.playtimeSeconds, 0);
  const earnedTrophies = overviewGames.reduce(
    (sum, game) =>
      sum +
      game.earnedTrophies.bronze +
      game.earnedTrophies.silver +
      game.earnedTrophies.gold +
      game.earnedTrophies.platinum,
    0
  );
  const recentGames = [...overviewGames]
    .filter((game) => game.lastPlayedAt || game.lastTrophyAt)
    .sort((a, b) => Math.max(b.lastPlayedAt, b.lastTrophyAt) - Math.max(a.lastPlayedAt, a.lastTrophyAt))
    .slice(0, 5);

  const formatCacheAge = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 1000 / 60);
    return minutes < 1 ? "刚刚" : `${minutes} 分钟前`;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">正在读取 PlayStation 数据…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Gamepad2 className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">无法读取这个 PSN 资料</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => fetchGames(true)} disabled={refreshing}>
          <RefreshCw className={refreshing ? "animate-spin" : ""} />
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">PlayStation 概览</h1>
          <p className="text-muted-foreground">
            {profile?.onlineId || psnId} 的 {currentYear} 年游玩与奖杯数据
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fromCache && cacheAge !== null && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              {formatCacheAge(cacheAge)}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchGames(true)} disabled={refreshing}>
            <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={`${currentYear} 游玩时长`} value={formatDuration(totalPlaytime)} icon={<Clock className="h-4 w-4 text-blue-500" />} className="from-blue-500/10 to-purple-500/10 border-blue-500/20" />
        <StatCard title="今年游戏数" value={overviewGames.length.toLocaleString()} detail={`${playedGames.length} 款有活动记录`} icon={<Gamepad2 className="h-4 w-4 text-green-500" />} className="from-green-500/10 to-emerald-500/10 border-green-500/20" />
        <StatCard title="今年奖杯数" value={earnedTrophies.toLocaleString()} icon={<Trophy className="h-4 w-4 text-amber-500" />} className="from-amber-500/10 to-orange-500/10 border-amber-500/20" />
        <StatCard title="今年最近活动" value={recentGames[0]?.name || "暂无记录"} detail={recentGames[0] ? formatDate(Math.max(recentGames[0].lastPlayedAt, recentGames[0].lastTrophyAt)) : ""} icon={<Calendar className="h-4 w-4 text-pink-500" />} className="from-pink-500/10 to-rose-500/10 border-pink-500/20" isTextValue={true} />
      </div>

      {overviewGames.length > 0 && (
        <GameCollage
          games={overviewGames}
          userName={profile?.onlineId || psnId || undefined}
          psnId={psnId || undefined}
          userAvatar={profile?.avatarUrl || undefined}
          periodLabel="游戏回顾"
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink href="/library" icon={<Gamepad2 className="h-6 w-6 text-blue-500" />} title="游戏库" detail={`${games.length} 款游戏`} />
        <QuickLink href="/charts" icon={<Trophy className="h-6 w-6 text-purple-500" />} title="统计图表" detail="游玩与奖杯趋势" />
        <QuickLink href="/shame" icon={<Trophy className="h-6 w-6 text-red-500" />} title="待完成清单" detail={`${incompleteGames.length} 款未满成就`} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>最近活动</CardTitle>
          <Link href="/timeline"><Button variant="ghost" size="sm" className="gap-2">查看时间线 <ArrowRight className="h-4 w-4" /></Button></Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {recentGames.map((game) => (
              <div key={game.id} className="group min-w-0">
                <div className={`${gameCoverAspectClass(game.platform)} flex items-center justify-center rounded-lg overflow-hidden bg-muted mb-2`}>
                  <img src={game.iconUrl} alt={game.name} className={`w-full ${gameCoverImageHeightClass(game.platform)} ${gameCoverObjectFit(game.platform)} group-hover:scale-105 transition-transform`} loading="lazy" />
                </div>
                <p className="text-sm font-medium truncate">{game.name}</p>
                <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <PlatformBadge platform={game.platform} />
                  <span>·</span>
                  <span>{game.trophyProgress}% 奖杯</span>
                  <span>·</span>
                  <span>{formatDuration(game.playtimeSeconds)}</span>
                </div>
              </div>
            ))}
          </div>
          {recentGames.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">PSN 没有返回最近活动记录。</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  detail,
  icon,
  className,
  isTextValue = false,
}: {
  title: string;
  value: string;
  detail?: string;
  icon: React.ReactNode;
  className: string;
  isTextValue?: boolean;
}) {
  return (
    <Card className={`bg-gradient-to-br ${className} flex flex-col justify-between`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-end">
        {isTextValue ? (
          <div className="text-sm sm:text-base font-bold line-clamp-2 leading-tight min-h-[2.5rem] flex items-center">
            {value}
          </div>
        ) : (
          <div className="text-2xl font-bold truncate">{value}</div>
        )}
        {detail && <p className="text-xs text-muted-foreground truncate mt-1">{detail}</p>}
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, icon, title, detail }: { href: string; icon: React.ReactNode; title: string; detail: string }) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">{icon}</div>
            <div><h3 className="font-semibold">{title}</h3><p className="text-sm text-muted-foreground">{detail}</p></div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </CardContent>
      </Card>
    </Link>
  );
}
