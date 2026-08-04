"use client";

import { useMemo } from "react";
import { BarChart3, Clock, Gamepad2, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlatformBadge from "@/app/components/PlatformBadge";
import type { PlayStationGame } from "@/app/types/playstation";
import {
  PLATFORM_DISTRIBUTION_ORDER,
  platformDistributionLabel,
} from "@/lib/playstation";
import type { PlatformDistributionLabel } from "@/lib/playstation";

const PLATFORM_COLORS: Record<(typeof PLATFORM_DISTRIBUTION_ORDER)[number], string> = {
  PS5: "#2563eb",
  PS4: "#7c3aed",
  PS3: "#db2777",
  App: "#10b981",
};

export default function PlaytimeChart({ games }: { games: PlayStationGame[] }) {
  const { topGames, durationRanges, progressRanges, platforms, totalPlatformGames } = useMemo(() => {
    const topGames = [...games].sort((a, b) => b.playtimeSeconds - a.playtimeSeconds).slice(0, 10).map((game) => ({ name: game.name.length > 16 ? `${game.name.slice(0, 16)}…` : game.name, hours: Number((game.playtimeSeconds / 3600).toFixed(1)) }));
    const ranges = [
      { range: "0h", min: 0, max: 1 },
      { range: "1–10h", min: 1, max: 10 },
      { range: "10–50h", min: 10, max: 50 },
      { range: "50–100h", min: 50, max: 100 },
      { range: "100h+", min: 100, max: Infinity },
    ];
    const durationRanges = ranges.map(({ range, min, max }) => ({ range, count: games.filter((game) => { const hours = game.playtimeSeconds / 3600; return hours >= min && hours < max; }).length }));
    const progressRanges = [
      { range: "0%", min: 0, max: 1 },
      { range: "1–25%", min: 1, max: 25 },
      { range: "25–50%", min: 25, max: 50 },
      { range: "50–99%", min: 50, max: 100 },
      { range: "100%", min: 100, max: 101 },
    ].map(({ range, min, max }) => ({ range, count: games.filter((game) => game.trophyProgress >= min && game.trophyProgress < max).length }));
    const platformCounts = new Map<PlatformDistributionLabel, number>(
      PLATFORM_DISTRIBUTION_ORDER.map((name) => [name, 0] as const)
    );
    let totalPlatformGames = 0;
    games.forEach((game) => {
      const name = platformDistributionLabel(game.platform || "");
      if (!name) return;
      platformCounts.set(name, (platformCounts.get(name) || 0) + 1);
      totalPlatformGames++;
    });
    const platforms = PLATFORM_DISTRIBUTION_ORDER.map((name) => ({
      name,
      value: platformCounts.get(name) || 0,
    })).filter((platform) => platform.value > 0);
    return { topGames, durationRanges, progressRanges, platforms, totalPlatformGames };
  }, [games]);

  if (!games.length) return <div className="py-16 text-center text-muted-foreground">暂无游戏数据</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="游玩时长分布" icon={<Clock className="h-4 w-4" />}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={durationRanges} margin={{ left: -15, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="游戏数" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="奖杯进度分布" icon={<Trophy className="h-4 w-4" />}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={progressRanges} margin={{ left: -15, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="游戏数" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="游玩时长 Top 10" icon={<BarChart3 className="h-4 w-4" />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topGames} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" unit="h" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => [`${value}h`, "时长"]} />
              <Bar dataKey="hours" fill="#db2777" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="平台分布" icon={<Gamepad2 className="h-4 w-4" />}>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={platforms}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={45}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {platforms.map((entry) => (
                    <Cell key={entry.name} fill={PLATFORM_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} 款游戏`, "数量"]} />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 pb-2">
              {platforms.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 bg-muted/60 px-2.5 py-1 rounded-lg border border-border/50 text-xs">
                  <PlatformBadge platform={entry.name} />
                  <span className="font-semibold text-foreground">{entry.value} 款</span>
                  {totalPlatformGames > 0 && (
                    <span className="text-muted-foreground text-[11px]">
                      ({((entry.value / totalPlatformGames) * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
      <p className="text-xs text-muted-foreground text-center">PSN 的游玩时长由 PlayStation 活动记录提供；部分游戏可能没有时长数据。</p>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>;
}
