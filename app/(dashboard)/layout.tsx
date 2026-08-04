"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LoginButton from "../components/LoginButton";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { GamesProvider } from "../components/GamesProvider";
import { LayoutDashboard, List, PieChart, Skull, Clock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const navItemsConfig = [
  { href: "/dashboard", labelKey: "overview" as const, icon: LayoutDashboard },
  { href: "/library", labelKey: "library" as const, icon: List },
  { href: "/reviews", labelKey: "trophies" as const, icon: Trophy },
  { href: "/timeline", labelKey: "timeline" as const, icon: Clock },
  { href: "/charts", labelKey: "charts" as const, icon: PieChart },
  { href: "/shame", labelKey: "shame" as const, icon: Skull },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2 font-bold">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/4/4e/Playstation_logo_colour.svg"
                alt=""
                className="h-6 w-6 object-contain"
              />
              <span className="hidden sm:inline bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                PS Stats
              </span>
            </Link>

            {/* Nav Links */}
            <nav className="flex items-center gap-1">
              {navItemsConfig.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const label = t.nav[item.labelKey];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline">{label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Info & Theme Switcher */}
            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeSwitcher />
              <LoginButton />
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pb-12">
        <GamesProvider>
          {children}
        </GamesProvider>
      </main>
    </div>
  );
}
