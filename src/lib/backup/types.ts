/** Versioned JSON backup — Settings export / restore-into-empty import. */

import type { ActiveSessionState } from "@/lib/db/activeSession";
import type { SessionRecord, SorenessRecord } from "@/lib/db/cardio";
import type { HistoryEntry } from "@/lib/db/history";
import type { Prefs } from "@/lib/db/schema";
import type { CalendarEntry, CycleState } from "@/lib/program/cycle";
import type { ProgramRecord } from "@/lib/program/types";

/** Bump when the on-disk backup shape changes. Importers reject newer versions. */
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupDataV1 {
  prefs: Prefs;
  cycle: CycleState;
  calendar: Record<string, CalendarEntry>;
  sessions: Record<string, SessionRecord>;
  exerciseHistory: Record<string, HistoryEntry[]>;
  notes: Record<string, string>;
  soreness: Record<string, SorenessRecord>;
  /** Present only when an in-progress session existed at export. */
  activeSession?: ActiveSessionState | null;
  /**
   * Present only when the program store differed from seed.
   * Omitted backups re-seed on import.
   */
  program?: ProgramRecord;
}

export interface BackupFileV1 {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  appVersion: string;
  data: BackupDataV1;
}

export type ActiveSessionRestoreDecision =
  | { action: "restore"; reason: string }
  | { action: "discard"; reason: string }
  | { action: "none"; reason: string };

export interface RestorePreview {
  exportedAt: string;
  appVersion: string;
  sessionCount: number;
  exerciseHistoryCount: number;
  calendarDayCount: number;
  dateRange: { earliest: string | null; latest: string | null };
  programIncluded: boolean;
  activeSession: ActiveSessionRestoreDecision;
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupError";
  }
}
