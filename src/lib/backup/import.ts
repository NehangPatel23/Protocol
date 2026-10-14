import { runStoresTransaction, type StoreWrite } from "@/lib/db/index";
import type { StoreName } from "@/lib/db/schema";
import { loadCalendar, loadCycle } from "@/lib/db/cycle";
import { loadAllHistory, localDateKey } from "@/lib/db/history";
import { loadAllSessions } from "@/lib/db/sessions";
import { PROGRAM_STORE_KEYS } from "@/lib/program/types";
import { buildProgramFromSeed } from "@/lib/program/seed";
import { decideActiveSessionRestore } from "./activeSession";
import { DEVICE_NOT_EMPTY_MESSAGE, isDeviceEmpty } from "./empty";
import { buildRestorePreview } from "./preview";
import {
  computeReconciledDerived,
  persistReconciledDerived,
} from "./reconcile";
import {
  BackupError,
  type BackupFileV1,
  type RestorePreview,
} from "./types";
import { parseBackupJson, validateBackupFile } from "./validate";

const CYCLE_KEY = "state";
const CALENDAR_KEY = "days";
const SORENESS_KEY = "days";
const PREFS_KEY = "user";
const ACTIVE_KEY = "current";

export interface RestorePlan {
  backup: BackupFileV1;
  preview: RestorePreview;
  writes: StoreWrite[];
  stores: StoreName[];
}

export interface DeviceSnapshot {
  calendar: Awaited<ReturnType<typeof loadCalendar>>;
  sessions: Awaited<ReturnType<typeof loadAllSessions>>;
  exerciseHistory: Awaited<ReturnType<typeof loadAllHistory>>;
  cycle: Awaited<ReturnType<typeof loadCycle>>;
}

/** Read the emptiness inputs from IndexedDB. */
export async function loadDeviceSnapshot(): Promise<DeviceSnapshot> {
  const [calendar, sessions, exerciseHistory, cycle] = await Promise.all([
    loadCalendar(),
    loadAllSessions(),
    loadAllHistory(),
    loadCycle(),
  ]);
  return { calendar, sessions, exerciseHistory, cycle };
}

/**
 * Validate the file and build an all-or-nothing write plan. Does not touch
 * storage. Throws BackupError on validation / emptiness / inconsistency.
 */
export function planRestore(
  rawText: string,
  device: DeviceSnapshot,
  today = localDateKey(),
): RestorePlan {
  const backup = validateBackupFile(parseBackupJson(rawText));

  if (!isDeviceEmpty(device)) {
    throw new BackupError(DEVICE_NOT_EMPTY_MESSAGE);
  }

  const preview = buildRestorePreview(backup, today);
  const writes = buildRestoreWrites(backup, today);
  const stores = [...new Set(writes.map((w) => w.store))];

  return { backup, preview, writes, stores };
}

export function buildRestoreWrites(
  backup: BackupFileV1,
  today = localDateKey(),
): StoreWrite[] {
  const { data } = backup;
  const writes: StoreWrite[] = [
    { op: "put", store: "prefs", key: PREFS_KEY, value: data.prefs },
    { op: "put", store: "cycle", key: CYCLE_KEY, value: data.cycle },
    { op: "put", store: "calendar", key: CALENDAR_KEY, value: data.calendar },
    { op: "put", store: "soreness", key: SORENESS_KEY, value: data.soreness },
  ];

  for (const [date, session] of Object.entries(data.sessions)) {
    writes.push({ op: "put", store: "sessions", key: date, value: session });
  }
  for (const [exerciseId, entries] of Object.entries(data.exerciseHistory)) {
    writes.push({
      op: "put",
      store: "exerciseHistory",
      key: exerciseId,
      value: entries,
    });
  }
  for (const [exerciseId, text] of Object.entries(data.notes)) {
    writes.push({ op: "put", store: "notes", key: exerciseId, value: text });
  }

  const program = data.program ?? buildProgramFromSeed();
  writes.push(
    {
      op: "put",
      store: "program",
      key: PROGRAM_STORE_KEYS.exercises,
      value: program.exercises,
    },
    {
      op: "put",
      store: "program",
      key: PROGRAM_STORE_KEYS.assignments,
      value: program.assignments,
    },
    {
      op: "put",
      store: "program",
      key: PROGRAM_STORE_KEYS.cycleOrder,
      value: program.cycleOrder,
    },
  );

  const decision = decideActiveSessionRestore(
    data.activeSession,
    data.calendar,
    today,
  );
  if (decision.action === "restore" && data.activeSession) {
    writes.push({
      op: "put",
      store: "activeSession",
      key: ACTIVE_KEY,
      value: data.activeSession,
    });
  }

  return writes;
}

export interface RestoreDependencies {
  loadDeviceSnapshot?: () => Promise<DeviceSnapshot>;
  commitWrites?: (stores: StoreName[], writes: StoreWrite[]) => Promise<void>;
  persistDerived?: typeof persistReconciledDerived;
  today?: string;
}

/**
 * Validate → refuse if not empty → single multi-store transaction → reconcile
 * derived prs/badges. Never writes on validation failure.
 */
export async function restoreBackup(
  rawText: string,
  deps: RestoreDependencies = {},
): Promise<RestorePreview> {
  const today = deps.today ?? localDateKey();
  const loadSnap = deps.loadDeviceSnapshot ?? loadDeviceSnapshot;
  const commit =
    deps.commitWrites ??
    ((stores, writes) => runStoresTransaction(stores, writes));
  const persistDerived = deps.persistDerived ?? persistReconciledDerived;

  const device = await loadSnap();
  const plan = planRestore(rawText, device, today);

  await commit(plan.stores, plan.writes);

  const program = plan.backup.data.program ?? buildProgramFromSeed();
  const derived = computeReconciledDerived(
    plan.backup.data.exerciseHistory,
    plan.backup.data.calendar,
    program,
    today,
  );
  await persistDerived(derived);

  return plan.preview;
}

/** Peek preview without writing — still enforces emptiness. */
export async function previewRestore(
  rawText: string,
  deps: Pick<RestoreDependencies, "loadDeviceSnapshot" | "today"> = {},
): Promise<RestorePreview> {
  const today = deps.today ?? localDateKey();
  const loadSnap = deps.loadDeviceSnapshot ?? loadDeviceSnapshot;
  const device = await loadSnap();
  return planRestore(rawText, device, today).preview;
}
