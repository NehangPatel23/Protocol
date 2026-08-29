"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { checkPersistence, getPrefs, setPrefs } from "@/lib/db";
import { DEFAULT_PREFS, type Prefs, type WeightUnit } from "@/lib/db/schema";

interface PrefsContextValue {
  prefs: Prefs;
  ready: boolean;
  persistenceOk: boolean | null;
  setUnits: (units: WeightUnit) => Promise<void>;
  updatePrefs: (patch: Partial<Prefs>) => Promise<void>;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);
  const [persistenceOk, setPersistenceOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await checkPersistence();
      if (cancelled) return;
      setPersistenceOk(ok);
      if (ok) {
        const loaded = await getPrefs();
        if (!cancelled) {
          setPrefsState(loaded);
          document.documentElement.classList.toggle(
            "light",
            loaded.theme === "light",
          );
        }
      } else {
        document.documentElement.classList.remove("light");
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePrefs = useCallback(async (patch: Partial<Prefs>) => {
    const next = await setPrefs(patch);
    setPrefsState(next);
    if (patch.theme) {
      document.documentElement.classList.toggle("light", next.theme === "light");
    }
  }, []);

  const setUnits = useCallback(
    async (units: WeightUnit) => {
      await updatePrefs({ units });
    },
    [updatePrefs],
  );

  return (
    <PrefsContext.Provider
      value={{ prefs, ready, persistenceOk, setUnits, updatePrefs }}
    >
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) {
    throw new Error("usePrefs must be used within PrefsProvider");
  }
  return ctx;
}
