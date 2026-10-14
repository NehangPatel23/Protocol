import { loadActiveSession } from "@/lib/db/activeSession";
import { loadCalendar, loadCycle } from "@/lib/db/cycle";
import { getPrefs } from "@/lib/db";
import { loadAllHistory, localDateKey } from "@/lib/db/history";
import { loadAllNotes, loadProgram } from "@/lib/db/program";
import { loadAllSessions } from "@/lib/db/sessions";
import { loadSoreness } from "@/lib/db/soreness";
import { initialCycleState } from "@/lib/program/cycle";
import { isSeedOnlyProgram } from "./programDiff";
import {
  BACKUP_SCHEMA_VERSION,
  type BackupDataV1,
  type BackupFileV1,
} from "./types";

/** Mirrors package.json version — kept inline so client bundles stay simple. */
export const APP_VERSION = "0.1.0";

export function backupFilename(date = localDateKey()): string {
  return `protocol-backup-${date}.json`;
}

/**
 * Snapshot user stores into a versioned backup. Excludes derived `prs` and
 * `badges`. Omits `program` when it matches seed (re-seeded on import).
 */
export async function buildBackupFile(
  now = new Date(),
): Promise<BackupFileV1> {
  const [
    prefs,
    cycleStored,
    calendar,
    sessions,
    exerciseHistory,
    notes,
    soreness,
    program,
    activeSession,
  ] = await Promise.all([
    getPrefs(),
    loadCycle(),
    loadCalendar(),
    loadAllSessions(),
    loadAllHistory(),
    loadAllNotes(),
    loadSoreness(),
    loadProgram(),
    loadActiveSession(),
  ]);

  const cycle = cycleStored ?? initialCycleState(localDateKey(now));
  const data: BackupDataV1 = {
    prefs,
    cycle,
    calendar,
    sessions,
    exerciseHistory,
    notes,
    soreness,
  };

  if (activeSession) {
    data.activeSession = activeSession;
  }

  if (!isSeedOnlyProgram(program)) {
    data.program = program;
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    appVersion: APP_VERSION,
    data,
  };
}

/** Serialize a backup for download / share. Never includes prs or badges. */
export function serializeBackup(backup: BackupFileV1): string {
  assertNoDerivedStores(backup);
  return `${JSON.stringify(backup, null, 2)}\n`;
}

function assertNoDerivedStores(backup: BackupFileV1): void {
  const data = backup.data as BackupDataV1 & {
    prs?: unknown;
    badges?: unknown;
  };
  if ("prs" in data || "badges" in data) {
    throw new Error("[protocol/backup] export must not include prs or badges");
  }
}
