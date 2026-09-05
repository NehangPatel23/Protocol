"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNav, SidebarNav } from "@/components/shell/AppNav";
import { usePrefs } from "@/components/PrefsProvider";

export function TabShell({ children }: { children: ReactNode }) {
  const { persistenceOk } = usePrefs();
  const pathname = usePathname();
  const sessionMode = pathname === "/session";

  return (
    <div className="flex min-h-dvh bg-base text-primary">
      {sessionMode ? null : <SidebarNav />}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        {persistenceOk === false ? (
          <div
            className="border-b border-warning/30 bg-warning-bg px-4 py-2 text-center text-[13px] text-warning"
            role="status"
          >
            Private browsing may limit saved data — workouts might not persist
            between visits.
          </div>
        ) : null}
        <main
          className={
            sessionMode
              ? "min-w-0 flex-1"
              : "mx-auto w-full max-w-3xl flex-1 px-4 pb-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] pt-4 md:max-w-none md:px-6 md:pb-8 md:pt-6"
          }
        >
          {children}
        </main>
        {sessionMode ? null : <BottomNav />}
      </div>
    </div>
  );
}
