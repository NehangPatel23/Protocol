/**
 * IndexedDB wrapper via `idb` — Master Prompt §5.1
 * Versioned schema with onupgradeneeded migration hook from day one.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  DB_NAME,
  DB_VERSION,
  DEFAULT_PREFS,
  STORE_NAMES,
  type Prefs,
  type StoreName,
} from "./schema";

interface ProtocolDB extends DBSchema {
  meta: {
    key: string;
    value: unknown;
  };
  prefs: {
    key: string;
    value: Prefs;
  };
  program: {
    key: string;
    value: unknown;
  };
  sessions: {
    key: string;
    value: unknown;
  };
  exerciseHistory: {
    key: string;
    value: unknown;
  };
  prs: {
    key: string;
    value: unknown;
  };
  badges: {
    key: string;
    value: unknown;
  };
  notes: {
    key: string;
    value: unknown;
  };
  soreness: {
    key: string;
    value: unknown;
  };
  calendar: {
    key: string;
    value: unknown;
  };
  cycle: {
    key: string;
    value: unknown;
  };
  activeSession: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<ProtocolDB>> | null = null;
let persistenceAvailable: boolean | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

async function upgrade(
  db: IDBPDatabase<ProtocolDB>,
  oldVersion: number,
) {
  // Schema versioning hook — extend with migrations as versions increase.
  if (oldVersion < 1) {
    for (const name of STORE_NAMES) {
      if (!db.objectStoreNames.contains(name)) {
        db.createObjectStore(name);
      }
    }
  }
}

export async function getDB(): Promise<IDBPDatabase<ProtocolDB>> {
  if (!isBrowser()) {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<ProtocolDB>(DB_NAME, DB_VERSION, {
      upgrade,
      blocked() {
        console.warn("[protocol/db] upgrade blocked — close other tabs");
      },
      blocking() {
        console.warn("[protocol/db] blocking newer version");
      },
      terminated() {
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

/** Detect private browsing / disabled IndexedDB (Safari). */
export async function checkPersistence(): Promise<boolean> {
  if (persistenceAvailable !== null) return persistenceAvailable;
  if (!isBrowser()) {
    persistenceAvailable = false;
    return false;
  }
  try {
    const db = await getDB();
    await db.put("meta", Date.now(), "persistenceProbe");
    await db.get("meta", "persistenceProbe");
    persistenceAvailable = true;
  } catch {
    persistenceAvailable = false;
  }
  return persistenceAvailable;
}

export async function getPrefs(): Promise<Prefs> {
  const db = await getDB();
  const stored = await db.get("prefs", "user");
  if (!stored) {
    await db.put("prefs", DEFAULT_PREFS, "user");
    return { ...DEFAULT_PREFS };
  }
  return { ...DEFAULT_PREFS, ...stored };
}

export async function setPrefs(patch: Partial<Prefs>): Promise<Prefs> {
  const db = await getDB();
  const current = await getPrefs();
  const next: Prefs = {
    ...current,
    ...patch,
    restTimerDefaults: {
      ...current.restTimerDefaults,
      ...(patch.restTimerDefaults ?? {}),
    },
    pauseMode: {
      ...current.pauseMode,
      ...(patch.pauseMode ?? {}),
    },
  };
  await db.put("prefs", next, "user");
  return next;
}

export async function getStoreValue<T>(
  store: StoreName,
  key: string,
): Promise<T | undefined> {
  const db = await getDB();
  return (await db.get(store, key)) as T | undefined;
}

export async function setStoreValue(
  store: StoreName,
  key: string,
  value: unknown,
): Promise<void> {
  const db = await getDB();
  await db.put(store, value, key);
}

export async function deleteStoreValue(
  store: StoreName,
  key: string,
): Promise<void> {
  const db = await getDB();
  await db.delete(store, key);
}
