"use client";

import { useGamesStore } from "@/lib/stores/useGamesStore";
import GameTimeline from "@/app/components/GameTimeline";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function TimelinePage() {
  const { t } = useI18n();
  const games = useGamesStore((s) => s.games);
  const loading = useGamesStore((s) => s.gamesLoading);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t.timeline.title}</h1>
        <p className="text-muted-foreground mt-1">
          {t.timeline.subtitle}
        </p>
      </div>

      <GameTimeline games={games} />
    </div>
  );
}
