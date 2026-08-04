"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t, language } = useI18n();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground opacity-50 px-2"
        disabled
      >
        <Sun className="h-4 w-4" />
        <span className="text-xs font-medium hidden sm:inline">...</span>
      </Button>
    );
  }

  const cycleTheme = () => {
    if (theme === "system") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("system");
    }
  };

  const getIcon = () => {
    if (theme === "light") return <Sun className="h-4 w-4 text-amber-500 transition-transform duration-300 rotate-0 hover:rotate-45" />;
    if (theme === "dark") return <Moon className="h-4 w-4 text-blue-400 transition-transform duration-300 hover:-rotate-12" />;
    return <Monitor className="h-4 w-4 text-muted-foreground" />;
  };

  const getTitle = () => {
    if (theme === "light") return "当前：浅色模式（点击切换至暗色）";
    if (theme === "dark") return "当前：暗色模式（点击切换至跟随系统）";
    return "当前：跟随系统（点击切换至浅色）";
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      className="gap-1.5 text-muted-foreground hover:text-foreground px-2 transition-all"
      title={getTitle()}
      aria-label="Toggle theme"
    >
      {getIcon()}
      <span className="text-xs font-medium capitalize hidden sm:inline">
        {theme === "light"
          ? t.common.themeLight
          : theme === "dark"
          ? t.common.themeDark
          : t.common.themeSystem}
      </span>
    </Button>
  );
}
