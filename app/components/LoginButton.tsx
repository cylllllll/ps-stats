"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";
import { PSN_ID_STORAGE_KEY } from "./GamesProvider";
import { useGamesStore } from "@/lib/stores/useGamesStore";

export default function LoginButton() {
  const router = useRouter();
  const { t } = useI18n();
  const psnId = useGamesStore((state) => state.psnId);
  const profile = useGamesStore((state) => state.profile);
  const setPsnId = useGamesStore((state) => state.setPsnId);
  const reset = useGamesStore((state) => state.reset);
  const [value, setValue] = useState("");

  if (!psnId) {
    return null;
  }

  const switchProfile = () => {
    const nextId = value.trim();
    if (!nextId) return;
    window.localStorage.setItem(PSN_ID_STORAGE_KEY, nextId);
    setPsnId(nextId);
    router.push(`/dashboard?psnId=${encodeURIComponent(nextId)}`);
    setValue("");
  };

  const leaveProfile = () => {
    window.localStorage.removeItem(PSN_ID_STORAGE_KEY);
    reset();
    router.push("/");
  };

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8 ring-2 ring-primary/20">
        <AvatarImage src={profile?.avatarUrl || ""} alt={psnId} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {psnId.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="hidden lg:flex flex-col min-w-0">
        <span className="text-sm font-medium truncate max-w-28">
          {profile?.onlineId || psnId}
        </span>
        <form
          className="flex items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            switchProfile();
          }}
        >
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t.login.switchPlaceholder}
            className="w-24 bg-transparent text-[11px] text-muted-foreground outline-none placeholder:text-muted-foreground/70"
            aria-label={t.login.switchPlaceholder}
          />
          <button
            type="submit"
            className="text-muted-foreground hover:text-foreground"
            title={t.login.switchProfile}
          >
            <ArrowRight className="h-3 w-3" />
          </button>
        </form>
      </div>
      <button
        onClick={leaveProfile}
        className="text-muted-foreground hover:text-destructive transition-colors"
        title={t.login.signOut}
        aria-label={t.login.signOut}
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
