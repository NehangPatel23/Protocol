"use client";

import { useEffect } from "react";

/**
 * Registers the app-shell worker in production only.
 * `next dev` skips this so Fast Refresh isn't fighting a cache.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[protocol/sw] registration failed", err);
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
