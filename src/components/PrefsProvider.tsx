"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  checkPersistence,
  mergePrefs,
  setPrefs as persistPrefs,
} from "@/lib/db";
import { getPrefs } from "@/lib/db";
import { DEFAULT_PREFS, type Prefs, type WeightUnit } from "@/lib/db/schema";

interface PrefsContextValue {
  prefs: Prefs;
  /** Always true after first paint — IDB hydrate is non-blocking. */
  ready: boolean;
  persistenceOk: boolean | null;
  setUnits: (units: WeightUnit) => Promise<void>;
  updatePrefs: (patch: Partial<Prefs>) => Promise<void>;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  // Local-first: never block the shell on IndexedDB. Defaults render immediately;
  // persisted prefs hydrate in the background.
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [ready] = useState(true);
  const [persistenceOk, setPersistenceOk] = useState<boolean | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    let cancelled = false;

    const failSafe = window.setTimeout(() => {
      if (cancelled) return;
      setPersistenceOk((prev) => prev ?? false);
    }, 2500);

    (async () => {
      try {
        const ok = await checkPersistence();
        if (cancelled) return;
        setPersistenceOk(ok);
        if (!ok) {
          document.documentElement.classList.remove("light");
          return;
        }
        const loaded = await getPrefs();
        if (cancelled) return;
        hydrated.current = true;
        setPrefsState(loaded);
        document.documentElement.classList.toggle(
          "light",
          loaded.theme === "light",
        );
      } catch (err) {
        console.error("[protocol/prefs] hydrate failed", err);
        if (!cancelled) {
          setPersistenceOk(false);
          document.documentElement.classList.remove("light");
        }
      } finally {
        window.clearTimeout(failSafe);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(failSafe);
    };
  }, []);

  const updatePrefs = useCallback(async (patch: Partial<Prefs>) => {
    // Optimistic local update so UI never waits on a hung IDB write.
    let next: Prefs = DEFAULT_PREFS;
    setPrefsState((current) => {
      next = mergePrefs(current, patch);
      return next;
    });
    if (patch.theme) {
      document.documentElement.classList.toggle("light", next.theme === "light");
    }
    try {
      const persisted = await persistPrefs(patch);
      setPrefsState(persisted);
      return persisted;
    } catch (err) {
      console.error("[protocol/prefs] persist failed — kept local", err);
      return next;
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
