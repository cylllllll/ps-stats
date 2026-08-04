"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Gamepad2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { PSN_ID_STORAGE_KEY } from "./components/GamesProvider";

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const [psnId, setPsnId] = useState("");
  const [error, setError] = useState("");

  const enterProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = psnId.trim();
    if (value.length < 3 || value.length > 16 || !/^[A-Za-z0-9_-]+$/.test(value)) {
      setError(t.landing.invalidId);
      return;
    }

    window.localStorage.setItem(PSN_ID_STORAGE_KEY, value);
    router.push(`/dashboard?psnId=${encodeURIComponent(value)}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 dark:from-slate-950 dark:via-neutral-900 dark:to-blue-950/40 relative overflow-x-hidden selection:bg-blue-100 dark:selection:bg-blue-900 w-full">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full bg-gradient-to-br from-blue-500/35 via-teal-400/25 to-transparent dark:from-blue-900/40 dark:via-teal-900/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full bg-gradient-to-tr from-red-500/30 via-amber-400/25 to-transparent dark:from-red-900/30 dark:via-amber-900/20 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
          backgroundImage: "linear-gradient(rgba(120, 120, 120, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 120, 120, 0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-16 sm:py-20 w-full">
        <div className="w-full max-w-2xl mx-auto text-center space-y-8 sm:space-y-10">
          <div className="inline-flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-amber-400 via-teal-400 to-blue-600 rounded-2xl blur-lg opacity-60 dark:opacity-75" />
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white dark:bg-neutral-900 flex items-center justify-center shadow-xl border border-neutral-200 dark:border-neutral-800 p-2">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/4/4e/Playstation_logo_colour.svg"
                  alt="PlayStation Logo"
                  className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                />
              </div>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {t.landing.title}
            </span>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-3xl sm:text-5xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight">
              {t.landing.heroLine}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-500 via-teal-500 to-blue-600 dark:from-red-400 dark:via-amber-400 dark:via-teal-400 dark:to-blue-400">
                {t.landing.heroAccent}
              </span>
            </h1>
            <p className="text-sm sm:text-lg text-neutral-500 dark:text-neutral-400 max-w-md mx-auto px-2">
              {t.landing.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left w-full">
            {[t.landing.feature1Title, t.landing.feature2Title].map(
              (title, index) => (
                <div key={title} className="rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border border-neutral-200/60 dark:border-neutral-800 p-4 shadow-sm">
                  <Sparkles className="h-5 w-5 text-blue-500 dark:text-blue-400 mb-3" />
                  <p className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm sm:text-base">{title}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {[t.landing.feature1Desc, t.landing.feature2Desc][index]}
                  </p>
                </div>
              )
            )}
          </div>

          <form onSubmit={enterProfile} className="w-full max-w-md mx-auto space-y-3">
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-2xl bg-white/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 p-1.5 sm:p-2 shadow-lg shadow-blue-100/50 dark:shadow-none w-full">
              <input
                value={psnId}
                onChange={(event) => {
                  setPsnId(event.target.value);
                  setError("");
                }}
                placeholder={t.landing.psnIdPlaceholder}
                className="min-w-0 flex-1 px-2.5 sm:px-3 text-sm sm:text-base bg-transparent outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                autoComplete="username"
                aria-label={t.landing.psnIdPlaceholder}
              />
              <Button type="submit" size="default" className="rounded-xl gap-1.5 text-sm sm:text-base px-3.5 sm:px-5 h-10 sm:h-11 shrink-0 whitespace-nowrap">
                {t.landing.enterProfile}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 px-2">{t.landing.psnIdHint}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>

          <p className="text-xs text-neutral-400 dark:text-neutral-500">{t.landing.poweredBy}</p>
        </div>
      </div>
    </main>
  );
}
