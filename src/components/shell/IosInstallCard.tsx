"use client";

import { Share } from "lucide-react";
import { useEffect, useState } from "react";
import {
  persistIosInstallDismissed,
  readIosInstallEnvironment,
  shouldShowIosInstallCard,
} from "@/lib/pwa/iosInstall";

/** One-time iOS Share → Add to Home Screen card. Master Prompt §6.13. */
export function IosInstallCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shouldShowIosInstallCard(readIosInstallEnvironment()));
  }, []);

  if (!visible) return null;

  return (
    <aside
      data-testid="ios-install-card"
      className="mb-4 rounded-xl border border-border-subtle bg-surface px-4 py-3.5"
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-base">
          <Share className="h-4 w-4 text-accent" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-primary">
            Add Protocol to your Home Screen
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-secondary">
            iPhone doesn&apos;t show an install prompt. Tap Share, then{" "}
            <span className="text-primary">Add to Home Screen</span> — it opens
            like an app, without the Safari bar.
          </p>
          <button
            type="button"
            data-testid="ios-install-dismiss"
            onClick={() => {
              persistIosInstallDismissed();
              setVisible(false);
            }}
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-border-subtle px-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-secondary"
          >
            Got it
          </button>
        </div>
      </div>
    </aside>
  );
}
