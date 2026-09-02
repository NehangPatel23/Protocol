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

const IDB_TIMEOUT_MS = 2000;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`[protocol/db] timeout after ${ms}ms: ${label}`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function ensureStores(db: IDBPDatabase<ProtocolDB>) {
  for (const name of STORE_NAMES) {
    if (!db.objectStoreNames.contains(name)) {
      db.createObjectStore(name);
    }
  }
}

async function upgrade(
  db: IDBPDatabase<ProtocolDB>,
  _oldVersion: number,
) {
  // Always ensure stores exist — covers incomplete prior upgrades.
  ensureStores(db);
}

export function resetDbConnection(): void {
  dbPromise = null;
  persistenceAvailable = null;
}

export async function getDB(): Promise<IDBPDatabase<ProtocolDB>> {
  if (!isBrowser()) {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<ProtocolDB>(DB_NAME, DB_VERSION, {
      upgrade,
      blocked() {
        console.warn(
          "[protocol/db] open blocked — another tab may be upgrading",
        );
      },
      blocking() {
        console.warn("[protocol/db] blocking newer version");
      },
      terminated() {
        dbPromise = null;
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  try {
    return await withTimeout(dbPromise, IDB_TIMEOUT_MS, "openDB");
  } catch (err) {
    // Drop a hung open so the next call can retry instead of waiting forever.
    resetDbConnection();
    throw err;
  }
}

/** Detect private browsing / disabled / hung IndexedDB. */
export async function checkPersistence(): Promise<boolean> {
  if (persistenceAvailable !== null) return persistenceAvailable;
  if (!isBrowser()) {
    persistenceAvailable = false;
    return false;
  }
  try {
    const db = await getDB();
    await withTimeout(
      db.put("meta", Date.now(), "persistenceProbe"),
      IDB_TIMEOUT_MS,
      "persistenceProbe:put",
    );
    await withTimeout(
      db.get("meta", "persistenceProbe"),
      IDB_TIMEOUT_MS,
      "persistenceProbe:get",
    );
    persistenceAvailable = true;
  } catch (err) {
    console.warn("[protocol/db] persistence unavailable", err);
    persistenceAvailable = false;
    resetDbConnection();
  }
  return persistenceAvailable;
}

export async function getPrefs(): Promise<Prefs> {
  const db = await getDB();
  const stored = await withTimeout(
    db.get("prefs", "user"),
    IDB_TIMEOUT_MS,
    "getPrefs",
  );
  if (!stored) {
    await withTimeout(
      db.put("prefs", DEFAULT_PREFS, "user"),
      IDB_TIMEOUT_MS,
      "seedPrefs",
    );
    return { ...DEFAULT_PREFS };
  }
  return { ...DEFAULT_PREFS, ...stored };
}

export function mergePrefs(current: Prefs, patch: Partial<Prefs>): Prefs {
  return {
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
}

export async function setPrefs(patch: Partial<Prefs>): Promise<Prefs> {
  const db = await getDB();
  const current = await getPrefs();
  const next = mergePrefs(current, patch);
  await withTimeout(db.put("prefs", next, "user"), IDB_TIMEOUT_MS, "setPrefs");
  return next;
}

export async function getStoreValue<T>(
  store: StoreName,
  key: string,
): Promise<T | undefined> {
  const db = await getDB();
  return (await withTimeout(
    db.get(store, key),
    IDB_TIMEOUT_MS,
    `get:${store}`,
  )) as T | undefined;
}

export async function setStoreValue(
  store: StoreName,
  key: string,
  value: unknown,
): Promise<void> {
  const db = await getDB();
  await withTimeout(db.put(store, value, key), IDB_TIMEOUT_MS, `put:${store}`);
}

export async function deleteStoreValue(
  store: StoreName,
  key: string,
): Promise<void> {
  const db = await getDB();
  await withTimeout(db.delete(store, key), IDB_TIMEOUT_MS, `del:${store}`);
}
