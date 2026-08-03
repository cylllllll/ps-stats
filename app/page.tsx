"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Gamepad2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "./components/LanguageSwitcher";
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 relative overflow-hidden selection:bg-blue-100">
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher />
      </div>

      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-200/60 via-indigo-200/40 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-violet-200/50 via-blue-200/30 to-transparent blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-20">
        <div className="max-w-2xl mx-auto text-center space-y-10">
          <div className="inline-flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl blur-lg opacity-40" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-700 flex items-center justify-center shadow-xl">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <span className="text-2xl font-bold text-neutral-900 tracking-tight">
              {t.landing.title}
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold text-neutral-900 tracking-tight leading-tight">
              {t.landing.heroLine}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500">
                {t.landing.heroAccent}
              </span>
            </h1>
            <p className="text-lg text-neutral-500 max-w-md mx-auto">
              {t.landing.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {[t.landing.feature1Title, t.landing.feature2Title, t.landing.feature3Title].map(
              (title, index) => (
                <div key={title} className="rounded-2xl bg-white/80 backdrop-blur-sm border border-neutral-200/60 p-4 shadow-sm">
                  <Sparkles className="h-5 w-5 text-blue-500 mb-3" />
                  <p className="font-semibold text-neutral-800">{title}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {[t.landing.feature1Desc, t.landing.feature2Desc, t.landing.feature3Desc][index]}
                  </p>
                </div>
              )
            )}
          </div>

          <form onSubmit={enterProfile} className="max-w-md mx-auto space-y-3">
            <div className="flex gap-2 rounded-2xl bg-white/90 border border-neutral-200 p-2 shadow-lg shadow-blue-100/50">
              <input
                value={psnId}
                onChange={(event) => {
                  setPsnId(event.target.value);
                  setError("");
                }}
                placeholder={t.landing.psnIdPlaceholder}
                className="min-w-0 flex-1 px-3 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-400"
                autoComplete="username"
                aria-label={t.landing.psnIdPlaceholder}
              />
              <Button type="submit" size="lg" className="rounded-xl gap-2">
                {t.landing.enterProfile}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-neutral-400">{t.landing.psnIdHint}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>

          <p className="text-xs text-neutral-400">{t.landing.poweredBy}</p>
        </div>
      </div>
    </main>
  );
}
