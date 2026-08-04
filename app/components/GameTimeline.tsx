"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Clock, Gamepad2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayStationGame } from "@/app/types/playstation";
import { activityTimestamp, formatDate, formatDuration, hasTrophyData } from "@/lib/playstation";
import { interpolate, useI18n } from "@/lib/i18n";
import PlatformBadge from "@/app/components/PlatformBadge";

interface GameTimelineProps {
  games: PlayStationGame[];
}

interface TimelineGroup {
  label: string;
  games: PlayStationGame[];
}

const RECENT_GROUPS = [
  { key: "today", max: 1 },
  { key: "yesterday", max: 2 },
  { key: "thisWeek", max: 7 },
  { key: "thisMonth", max: 30 },
  { key: "lastThreeMonths", max: 90 },
] as const;

export default function GameTimeline({ games }: GameTimelineProps) {
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const [nowTimestamp] = useState(() => Date.now() / 1000);
  const { groups, recent, forgotten, onThisDay } = useMemo(() => {
    const now = nowTimestamp;
    const currentYear = new Date(now * 1000).getFullYear();
    const activeGames = games
      .filter((game) => activityTimestamp(game) > 0)
      .sort((a, b) => activityTimestamp(b) - activityTimestamp(a));
    const groups: TimelineGroup[] = [];
    const currentYearGames = activeGames.filter(
      (game) => new Date(activityTimestamp(game) * 1000).getFullYear() === currentYear
    );

    RECENT_GROUPS.forEach((group, index) => {
      const min = index === 0 ? 0 : RECENT_GROUPS[index - 1].max;
      const selected = currentYearGames.filter((game) => {
        const days = (now - activityTimestamp(game)) / 86_400;
        return index === 0 ? days < 1 : days >= min && days < group.max;
      });
      if (selected.length) groups.push({ label: t.timeline[group.key], games: selected });
    });

    const thisYear = currentYearGames.filter((game) => {
      const days = (now - activityTimestamp(game)) / 86_400;
      return days >= RECENT_GROUPS[RECENT_GROUPS.length - 1].max;
    });
    if (thisYear.length) groups.push({ label: t.timeline.thisYear, games: thisYear });

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
      .forEach(([year, yearGames]) => groups.push({ label: interpolate(t.timeline.year, { year }), games: yearGames }));

    const recent = activeGames
      .filter((game) => now - activityTimestamp(game) < 7 * 86_400)
      .sort((a, b) => b.playtimeSeconds - a.playtimeSeconds)
      .slice(0, 5);
    const forgotten = activeGames
      .filter((game) => now - activityTimestamp(game) > 365 * 86_400 && game.trophyProgress > 0 && game.trophyProgress < 100)
      .sort((a, b) => b.trophyProgress - a.trophyProgress)
      .slice(0, 5);
    const today = new Date();
    const onThisDay = activeGames
      .filter((game) => {
        const date = new Date(activityTimestamp(game) * 1000);
        return date.getMonth() === today.getMonth() && Math.abs(date.getDate() - today.getDate()) <= 2 && date.getFullYear() < today.getFullYear();
      })
      .slice(0, 6);

    return { groups, recent, forgotten, onThisDay };
  }, [games, nowTimestamp, t]);

  return (
    <div className="space-y-6">
      {onThisDay.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t.timeline.onThisDay}
            </CardTitle>
            <CardDescription>{t.timeline.onThisDayDescription}</CardDescription>
          </CardHeader>
          <CardContent><GameList games={onThisDay} /></CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <ActivityCard title={t.timeline.recent} description={t.timeline.recentDescription} icon={<Gamepad2 className="h-4 w-4" />} games={recent} empty={t.timeline.recentEmpty} />
        <ActivityCard title={t.timeline.forgotten} description={t.timeline.forgottenDescription} icon={<Clock className="h-4 w-4" />} games={forgotten} empty={t.timeline.forgottenEmpty} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" />{t.timeline.activity}</CardTitle>
          <CardDescription>{t.timeline.activityDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">{t.timeline.noActivity}</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-6">
                {(showAll ? groups : groups.slice(0, 4)).map((group, index) => (
                  <div key={group.label} className="relative pl-10">
                    <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-background ${index === 0 ? "bg-primary" : "bg-muted-foreground/50"}`} />
                    <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                      {group.label}
                      <Badge variant="secondary" className="text-xs">{group.games.length}</Badge>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {group.games.slice(0, 12).map((game, gameIndex) => <GameTile key={`${game.id}-${gameIndex}`} game={game} />)}
                      {group.games.length > 12 && <div className="flex items-center justify-center bg-muted rounded-lg text-muted-foreground text-sm">+{group.games.length - 12}</div>}
                    </div>
                  </div>
                ))}
              </div>
              {groups.length > 4 && (
                <div className="mt-6 text-center">
                  <Button variant="outline" size="sm" onClick={() => setShowAll((value) => !value)} className="gap-2">
                    {showAll ? <><ChevronUp className="h-4 w-4" />{t.timeline.collapse}</> : <><ChevronDown className="h-4 w-4" />{t.timeline.showMore}</>}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityCard({ title, description, icon, games, empty }: { title: string; description: string; icon: React.ReactNode; games: PlayStationGame[]; empty: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent>{games.length ? <GameList games={games} /> : <p className="text-sm text-muted-foreground py-4">{empty}</p>}</CardContent>
    </Card>
  );
}

function GameList({ games }: { games: PlayStationGame[] }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      {games.map((game, index) => (
        <div key={`${game.id}-${index}`} className="flex items-center gap-3">
          <img src={game.iconUrl} alt="" className="w-10 h-10 rounded object-cover bg-muted" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{game.name}</p>
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <PlatformBadge platform={game.platform} />
              {hasTrophyData(game) && <><span>·</span><span>{game.trophyProgress}% {t.common.trophy}</span></>}
              <span>·</span><span>{formatDuration(game.playtimeSeconds, t.common.noDuration)}</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">{formatDate(activityTimestamp(game))}</Badge>
        </div>
      ))}
    </div>
  );
}

function GameTile({ game }: { game: PlayStationGame }) {
  return (
    <div className="group relative flex items-center justify-center">
      <img src={game.iconUrl} alt={game.name} className="w-full aspect-square object-cover rounded-lg transition-transform group-hover:scale-105 bg-muted" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
        <div>
          <p className="text-white text-xs font-medium line-clamp-1">{game.name}</p>
          <div className="flex flex-wrap items-center gap-1 text-white/80 text-[10px] mt-0.5">
            <PlatformBadge platform={game.platform} className="px-1 py-0 text-[9px] bg-white/20 text-white border-0" />
            <span>·</span><span>{formatDate(activityTimestamp(game))}</span>
            {hasTrophyData(game) && <><span>·</span><span>{game.trophyProgress}%</span></>}
          </div>
        </div>
      </div>
    </div>
  );
}
