"use client";

import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";

export default function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border/40 py-6 mt-auto">
      <div className="container mx-auto px-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <LanguageSwitcher />
        <div className="flex items-center justify-end text-right">
          <a
            href="https://t.me/PlayStationNewssss"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground hover:underline"
          >
            <Image src="/telegram.svg" alt="" aria-hidden="true" width={16} height={16} className="h-4 w-4 dark:invert" />
            {t.footer.news}
          </a>
        </div>
      </div>
    </footer>
  );
}
