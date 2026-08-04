"use client";

import { useState } from "react";
import Image from "next/image";
import { useI18n, type Language } from "@/lib/i18n";

const LANGUAGE_OPTIONS: Array<{ value: Language; labelKey: "simplified" | "traditional" | "english" | "japanese" }> = [
  { value: "zh", labelKey: "simplified" },
  { value: "zh-TW", labelKey: "traditional" },
  { value: "en", labelKey: "english" },
  { value: "ja", labelKey: "japanese" },
];

const LANGUAGE_MARKS: Record<Language, string> = {
  zh: "中",
  "zh-TW": "繁",
  en: "英",
  ja: "日",
};

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${t.language.choose}: ${t.language[LANGUAGE_OPTIONS.find((option) => option.value === language)?.labelKey || "simplified"]}`}
        title={t.language.choose}
        className="flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full border border-border/70 bg-background/90 px-2 text-sm font-semibold text-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-muted supports-[backdrop-filter]:bg-background/75"
      >
        <Image src="/language.svg" alt="" aria-hidden="true" width={16} height={16} className="h-4 w-4 dark:invert" />
        {LANGUAGE_MARKS[language]}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t.language.choose}
          className="absolute bottom-11 left-0 min-w-32 overflow-hidden rounded-lg border border-border/70 bg-background/95 p-1 shadow-xl backdrop-blur-md supports-[backdrop-filter]:bg-background/80"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitem"
              onClick={() => {
                setLanguage(option.value);
                setOpen(false);
              }}
              className={`block w-full rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-muted ${language === option.value ? "bg-muted font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {t.language[option.labelKey]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
