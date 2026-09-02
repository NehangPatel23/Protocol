"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SPLASH_MS = 1800;
const FADE_MS = 420;
const SESSION_KEY = "protocol-splash-shown";

/**
 * Branded launch splash — P glyph + Protocol wordmark.
 * Shows once per browser tab session so soft navigations don't re-trigger it.
 * Always pointer-events-none so a stuck splash can never block the app.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch {
      /* private mode — still show splash */
    }

    setVisible(true);
    const exitTimer = window.setTimeout(() => {
      if (!cancelled) setExiting(true);
    }, SPLASH_MS);
    const hideTimer = window.setTimeout(() => {
      if (cancelled) return;
      setVisible(false);
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
    }, SPLASH_MS + FADE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center bg-base transition-opacity duration-[420ms] ease-out ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
      role="presentation"
      aria-hidden
    >
      <div className="flex flex-col items-center gap-5">
        <div className="protocol-splash-glyph relative h-28 w-28 overflow-hidden rounded-[28px] shadow-[0_0_48px_rgba(20,184,166,0.22)]">
          <Image
            src="/icons/icon-p-192.png"
            alt=""
            width={192}
            height={192}
            priority
            className="h-full w-full object-cover"
          />
        </div>
        <p className="protocol-splash-wordmark text-[13px] font-semibold uppercase tracking-[0.28em] text-accent">
          Protocol
        </p>
      </div>
    </div>
  );
}
