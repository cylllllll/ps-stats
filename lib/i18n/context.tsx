"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type Language, type TranslationKeys } from "./translations";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const DEFAULT_LANGUAGE: Language = "zh";
export const STORAGE_KEY = "playstation-stats-language";

function isLanguage(value: string | null): value is Language {
  return value !== null && Object.prototype.hasOwnProperty.call(translations, value);
}

function languageFromTag(tag: string): Language | null {
  const normalized = tag.trim().toLocaleLowerCase().replace(/_/g, "-");
  if (!normalized) return null;
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "ja" || normalized.startsWith("ja-")) return "ja";
  if (normalized === "zh" || normalized.startsWith("zh-")) {
    return /(?:^|-)hant(?:-|$)/.test(normalized) || /(?:^|-)(tw|hk|mo)(?:-|$)/.test(normalized)
      ? "zh-TW"
      : "zh";
  }
  return null;
}

export function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") return DEFAULT_LANGUAGE;

  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ];

  for (const candidate of candidates) {
    const language = languageFromTag(candidate || "");
    if (language) return language;
  }

  return DEFAULT_LANGUAGE;
}

function getSavedLanguage(): Language | null {
  if (typeof window === "undefined") return null;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return isLanguage(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLanguageState(getSavedLanguage() ?? detectBrowserLanguage());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch {
      // Language changes still work when storage is disabled or unavailable.
    }
  }, []);

  useEffect(() => {
    const htmlLanguage = language === "zh-TW" ? "zh-Hant" : language === "zh" ? "zh-CN" : language;
    document.documentElement.lang = htmlLanguage;
  }, [language]);

  const t = useMemo(() => translations[language], [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function interpolate<T extends object>(template: string, values: T): string {
  const record = values as Record<string, unknown>;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(record[key] ?? `{${key}}`));
}
