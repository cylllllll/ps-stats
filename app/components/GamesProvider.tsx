"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useGamesStore } from "@/lib/stores/useGamesStore";

const PSN_ID_STORAGE_KEY = "playstation-stats-psn-id";

export function GamesProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const psnId = useGamesStore((state) => state.psnId);
  const setPsnId = useGamesStore((state) => state.setPsnId);
  const initializeData = useGamesStore((state) => state.initializeData);
  const reset = useGamesStore((state) => state.reset);

  useEffect(() => {
    const queryId = new URLSearchParams(window.location.search).get("psnId")?.trim();
    const storedId = window.localStorage.getItem(PSN_ID_STORAGE_KEY)?.trim();
    const nextId = queryId || storedId;

    if (nextId) {
      window.localStorage.setItem(PSN_ID_STORAGE_KEY, nextId);
      setPsnId(nextId);
    } else {
      router.replace("/");
    }
  }, [router, setPsnId]);

  useEffect(() => {
    if (psnId) initializeData();
  }, [initializeData, psnId]);

  useEffect(() => {
    if (pathname === "/") reset();
  }, [pathname, reset]);

  if (!psnId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

export { PSN_ID_STORAGE_KEY };
