import type { ActiveSessionState } from "@/lib/db/activeSession";
import type { CardioLog, SessionRecord, SorenessRecord } from "@/lib/db/cardio";
import type { HistoryEntry, HistorySet } from "@/lib/db/history";
import type { Prefs } from "@/lib/db/schema";
import type { CalendarEntry, CycleState } from "@/lib/program/cycle";
import type {
  DayAssignment,
  DayKey,
  ProgramRecord,
} from "@/lib/program/types";
import { assertCycleCalendarConsistent } from "./consistency";
import {
  BACKUP_SCHEMA_VERSION,
  BackupError,
  type BackupDataV1,
  type BackupFileV1,
} from "./types";

const DAY_KEYS = new Set<DayKey>([
  "push",
  "pull",
  "legs",
  "rest",
  "upper",
  "lower",
]);

const CALENDAR_STATUSES = new Set([
  "completed",
  "missed",
  "rest",
  "adhoc",
  "recovery",
  "blank",
]);

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseBackupJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new BackupError("Backup file is not valid JSON.");
  }
}

/**
 * Validate backup shape before any storage write. Rejects newer schemaVersion
 * and inconsistent cycle/calendar. On any failure, throws BackupError.
 */
export function validateBackupFile(raw: unknown): BackupFileV1 {
  if (!isPlainObject(raw)) {
    throw new BackupError("Backup file has the wrong shape.");
  }
  if (typeof raw.schemaVersion !== "number") {
    throw new BackupError("Backup is missing schemaVersion.");
  }
  if (raw.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new BackupError(
      `This backup was created with a newer version of Protocol (schema ${raw.schemaVersion}) and can't be restored yet.`,
    );
  }
  if (raw.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new BackupError(
      `Unsupported backup schemaVersion (${raw.schemaVersion}).`,
    );
  }
  if (typeof raw.exportedAt !== "string" || raw.exportedAt.trim() === "") {
    throw new BackupError("Backup is missing exportedAt.");
  }
  if (typeof raw.appVersion !== "string") {
    throw new BackupError("Backup is missing appVersion.");
  }
  if (!isPlainObject(raw.data)) {
    throw new BackupError("Backup is missing data.");
  }

  const data = validateBackupData(raw.data);
  assertCycleCalendarConsistent(data.cycle, data.calendar);

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: raw.exportedAt,
    appVersion: raw.appVersion,
    data,
  };
}

function validateBackupData(data: Record<string, unknown>): BackupDataV1 {
  const prefs = validatePrefs(data.prefs);
  const cycle = validateCycle(data.cycle);
  const calendar = validateCalendar(data.calendar);
  const sessions = validateSessions(data.sessions);
  const exerciseHistory = validateExerciseHistory(data.exerciseHistory);
  const notes = validateNotes(data.notes);
  const soreness = validateSoreness(data.soreness);

  let activeSession: ActiveSessionState | null | undefined;
  if ("activeSession" in data) {
    if (data.activeSession == null) {
      activeSession = null;
    } else {
      activeSession = validateActiveSession(data.activeSession);
    }
  }

  let program: ProgramRecord | undefined;
  if ("program" in data && data.program != null) {
    program = validateProgram(data.program);
  }

  return {
    prefs,
    cycle,
    calendar,
    sessions,
    exerciseHistory,
    notes,
    soreness,
    ...(activeSession !== undefined ? { activeSession } : {}),
    ...(program ? { program } : {}),
  };
}

function validatePrefs(value: unknown): Prefs {
  if (!isPlainObject(value)) {
    throw new BackupError("Backup prefs has the wrong shape.");
  }
  if (value.units !== "kg" && value.units !== "lb") {
    throw new BackupError("Backup prefs.units is invalid.");
  }
  if (value.distanceUnits !== "km" && value.distanceUnits !== "mi") {
    throw new BackupError("Backup prefs.distanceUnits is invalid.");
  }
  if (value.theme !== "dark" && value.theme !== "light") {
    throw new BackupError("Backup prefs.theme is invalid.");
  }
  if (
    value.cycleStartDate != null &&
    (typeof value.cycleStartDate !== "string" ||
      !DATE_KEY_RE.test(value.cycleStartDate))
  ) {
    throw new BackupError("Backup prefs.cycleStartDate is invalid.");
  }
  if (!isPlainObject(value.restTimerDefaults)) {
    throw new BackupError("Backup prefs.restTimerDefaults has the wrong shape.");
  }
  if (
    typeof value.restTimerDefaults.compoundSec !== "number" ||
    typeof value.restTimerDefaults.isolationSec !== "number"
  ) {
    throw new BackupError("Backup prefs.restTimerDefaults is invalid.");
  }
  for (const key of [
    "voiceGuided",
    "wakeLock",
    "timerSounds",
    "timerVibration",
  ] as const) {
    if (typeof value[key] !== "boolean") {
      throw new BackupError(`Backup prefs.${key} is invalid.`);
    }
  }
  if (!isPlainObject(value.pauseMode)) {
    throw new BackupError("Backup prefs.pauseMode has the wrong shape.");
  }
  if (typeof value.pauseMode.active !== "boolean") {
    throw new BackupError("Backup prefs.pauseMode.active is invalid.");
  }
  if (
    value.pauseMode.until != null &&
    typeof value.pauseMode.until !== "string"
  ) {
    throw new BackupError("Backup prefs.pauseMode.until is invalid.");
  }
  return value as unknown as Prefs;
}

function validateCycle(value: unknown): CycleState {
  if (!isPlainObject(value)) {
    throw new BackupError("Backup cycle has the wrong shape.");
  }
  if (typeof value.pointerIndex !== "number") {
    throw new BackupError("Backup cycle.pointerIndex is invalid.");
  }
  if (
    value.lastCompletedDate != null &&
    (typeof value.lastCompletedDate !== "string" ||
      !DATE_KEY_RE.test(value.lastCompletedDate))
  ) {
    throw new BackupError("Backup cycle.lastCompletedDate is invalid.");
  }
  if (typeof value.pendingSince !== "string" || !DATE_KEY_RE.test(value.pendingSince)) {
    throw new BackupError("Backup cycle.pendingSince is invalid.");
  }
  if (
    typeof value.lastEvaluatedDate !== "string" ||
    !DATE_KEY_RE.test(value.lastEvaluatedDate)
  ) {
    throw new BackupError("Backup cycle.lastEvaluatedDate is invalid.");
  }
  if (
    "started" in value &&
    value.started !== undefined &&
    typeof value.started !== "boolean"
  ) {
    throw new BackupError("Backup cycle.started is invalid.");
  }
  return value as unknown as CycleState;
}

function validateCalendar(
  value: unknown,
): Record<string, CalendarEntry> {
  if (!isPlainObject(value)) {
    throw new BackupError("Backup calendar has the wrong shape.");
  }
  const out: Record<string, CalendarEntry> = {};
  for (const [date, entry] of Object.entries(value)) {
    if (!DATE_KEY_RE.test(date)) {
      throw new BackupError(`Backup calendar key "${date}" is invalid.`);
    }
    if (!isPlainObject(entry)) {
      throw new BackupError(`Backup calendar[${date}] has the wrong shape.`);
    }
    if (
      typeof entry.status !== "string" ||
      !CALENDAR_STATUSES.has(entry.status)
    ) {
      throw new BackupError(`Backup calendar[${date}].status is invalid.`);
    }
    if (
      entry.dayKey != null &&
      (typeof entry.dayKey !== "string" || !DAY_KEYS.has(entry.dayKey as DayKey))
    ) {
      throw new BackupError(`Backup calendar[${date}].dayKey is invalid.`);
    }
    out[date] = entry as unknown as CalendarEntry;
  }
  return out;
}

function validateSessions(
  value: unknown,
): Record<string, SessionRecord> {
  if (!isPlainObject(value)) {
    throw new BackupError("Backup sessions has the wrong shape.");
  }
  const out: Record<string, SessionRecord> = {};
  for (const [date, record] of Object.entries(value)) {
    if (!DATE_KEY_RE.test(date)) {
      throw new BackupError(`Backup sessions key "${date}" is invalid.`);
    }
    if (!isPlainObject(record)) {
      throw new BackupError(`Backup sessions[${date}] has the wrong shape.`);
    }
    if (typeof record.date !== "string" || record.date !== date) {
      throw new BackupError(`Backup sessions[${date}].date is invalid.`);
    }
    if (
      typeof record.dayKey !== "string" ||
      !DAY_KEYS.has(record.dayKey as DayKey)
    ) {
      throw new BackupError(`Backup sessions[${date}].dayKey is invalid.`);
    }
    if (record.type !== "program" && record.type !== "adhoc") {
      throw new BackupError(`Backup sessions[${date}].type is invalid.`);
    }
    if (!Array.isArray(record.entries)) {
      throw new BackupError(`Backup sessions[${date}].entries is invalid.`);
    }
    if (typeof record.complete !== "boolean") {
      throw new BackupError(`Backup sessions[${date}].complete is invalid.`);
    }
    if (record.cardio != null) {
      validateCardio(record.cardio, `sessions[${date}].cardio`);
    }
    out[date] = record as unknown as SessionRecord;
  }
  return out;
}

function validateExerciseHistory(
  value: unknown,
): Record<string, HistoryEntry[]> {
  if (!isPlainObject(value)) {
    throw new BackupError("Backup exerciseHistory has the wrong shape.");
  }
  const out: Record<string, HistoryEntry[]> = {};
  for (const [exerciseId, entries] of Object.entries(value)) {
    if (typeof exerciseId !== "string" || exerciseId.trim() === "") {
      throw new BackupError("Backup exerciseHistory has an invalid key.");
    }
    if (!Array.isArray(entries)) {
      throw new BackupError(
        `Backup exerciseHistory[${exerciseId}] has the wrong shape.`,
      );
    }
    out[exerciseId] = entries.map((entry, i) =>
      validateHistoryEntry(entry, exerciseId, i),
    );
  }
  return out;
}

function validateHistoryEntry(
  value: unknown,
  exerciseId: string,
  index: number,
): HistoryEntry {
  const path = `exerciseHistory[${exerciseId}][${index}]`;
  if (!isPlainObject(value)) {
    throw new BackupError(`Backup ${path} has the wrong shape.`);
  }
  if (typeof value.date !== "string" || !DATE_KEY_RE.test(value.date)) {
    throw new BackupError(`Backup ${path}.date is invalid.`);
  }
  if (
    value.dayKey != null &&
    (typeof value.dayKey !== "string" || !DAY_KEYS.has(value.dayKey as DayKey))
  ) {
    throw new BackupError(`Backup ${path}.dayKey is invalid.`);
  }
  if (!Array.isArray(value.sets)) {
    throw new BackupError(`Backup ${path}.sets is invalid.`);
  }
  const sets = value.sets.map((set, i) =>
    validateHistorySet(set, `${path}.sets[${i}]`),
  );
  return {
    date: value.date,
    ...(value.dayKey != null ? { dayKey: value.dayKey as DayKey } : {}),
    sets,
  };
}

function validateHistorySet(value: unknown, path: string): HistorySet {
  if (!isPlainObject(value)) {
    throw new BackupError(`Backup ${path} has the wrong shape.`);
  }
  if (typeof value.id !== "string") {
    throw new BackupError(`Backup ${path}.id is invalid.`);
  }
  if (typeof value.weightKg !== "number") {
    throw new BackupError(`Backup ${path}.weightKg is invalid.`);
  }
  if (typeof value.reps !== "number") {
    throw new BackupError(`Backup ${path}.reps is invalid.`);
  }
  if (typeof value.loggedAt !== "string") {
    throw new BackupError(`Backup ${path}.loggedAt is invalid.`);
  }
  return value as unknown as HistorySet;
}

function validateNotes(value: unknown): Record<string, string> {
  if (!isPlainObject(value)) {
    throw new BackupError("Backup notes has the wrong shape.");
  }
  const out: Record<string, string> = {};
  for (const [id, text] of Object.entries(value)) {
    if (typeof text !== "string") {
      throw new BackupError(`Backup notes[${id}] is invalid.`);
    }
    out[id] = text;
  }
  return out;
}

function validateSoreness(
  value: unknown,
): Record<string, SorenessRecord> {
  if (!isPlainObject(value)) {
    throw new BackupError("Backup soreness has the wrong shape.");
  }
  const out: Record<string, SorenessRecord> = {};
  for (const [date, record] of Object.entries(value)) {
    if (!DATE_KEY_RE.test(date)) {
      throw new BackupError(`Backup soreness key "${date}" is invalid.`);
    }
    if (!isPlainObject(record)) {
      throw new BackupError(`Backup soreness[${date}] has the wrong shape.`);
    }
    if (record.markedSore !== true) {
      throw new BackupError(`Backup soreness[${date}].markedSore is invalid.`);
    }
    if (
      typeof record.originalDayKey !== "string" ||
      !DAY_KEYS.has(record.originalDayKey as DayKey)
    ) {
      throw new BackupError(
        `Backup soreness[${date}].originalDayKey is invalid.`,
      );
    }
    if (typeof record.reversedSameDay !== "boolean") {
      throw new BackupError(
        `Backup soreness[${date}].reversedSameDay is invalid.`,
      );
    }
    if (record.cardioLogged != null) {
      validateCardio(record.cardioLogged, `soreness[${date}].cardioLogged`);
    }
    out[date] = record as unknown as SorenessRecord;
  }
  return out;
}

function validateActiveSession(value: unknown): ActiveSessionState {
  if (!isPlainObject(value)) {
    throw new BackupError("Backup activeSession has the wrong shape.");
  }
  if (typeof value.date !== "string" || !DATE_KEY_RE.test(value.date)) {
    throw new BackupError("Backup activeSession.date is invalid.");
  }
  if (
    typeof value.dayKey !== "string" ||
    !DAY_KEYS.has(value.dayKey as DayKey)
  ) {
    throw new BackupError("Backup activeSession.dayKey is invalid.");
  }
  if (typeof value.currentStep !== "number") {
    throw new BackupError("Backup activeSession.currentStep is invalid.");
  }
  if (typeof value.startedAt !== "string") {
    throw new BackupError("Backup activeSession.startedAt is invalid.");
  }
  if (value.restEndsAt != null && typeof value.restEndsAt !== "string") {
    throw new BackupError("Backup activeSession.restEndsAt is invalid.");
  }
  if (
    value.restDurationSec != null &&
    typeof value.restDurationSec !== "number"
  ) {
    throw new BackupError("Backup activeSession.restDurationSec is invalid.");
  }
  return value as unknown as ActiveSessionState;
}

function validateProgram(value: unknown): ProgramRecord {
  if (!isPlainObject(value)) {
    throw new BackupError("Backup program has the wrong shape.");
  }
  if (!isPlainObject(value.exercises)) {
    throw new BackupError("Backup program.exercises has the wrong shape.");
  }
  if (!isPlainObject(value.assignments)) {
    throw new BackupError("Backup program.assignments has the wrong shape.");
  }
  if (!Array.isArray(value.cycleOrder) || value.cycleOrder.length < 1) {
    throw new BackupError("Backup program.cycleOrder is invalid.");
  }
  for (const day of value.cycleOrder) {
    if (typeof day !== "string" || !DAY_KEYS.has(day as DayKey)) {
      throw new BackupError("Backup program.cycleOrder contains an invalid day.");
    }
  }
  for (const [id, ex] of Object.entries(value.exercises)) {
    if (!isPlainObject(ex) || typeof ex.name !== "string") {
      throw new BackupError(`Backup program.exercises[${id}] is invalid.`);
    }
  }
  for (const [day, rows] of Object.entries(value.assignments)) {
    if (!DAY_KEYS.has(day as DayKey) || !Array.isArray(rows)) {
      throw new BackupError(`Backup program.assignments[${day}] is invalid.`);
    }
    for (const row of rows as DayAssignment[]) {
      if (!row || typeof row.exerciseId !== "string") {
        throw new BackupError(
          `Backup program.assignments[${day}] has an invalid row.`,
        );
      }
    }
  }
  return value as unknown as ProgramRecord;
}

function validateCardio(value: unknown, path: string): asserts value is CardioLog {
  if (!isPlainObject(value)) {
    throw new BackupError(`Backup ${path} has the wrong shape.`);
  }
  if (typeof value.activity !== "string") {
    throw new BackupError(`Backup ${path}.activity is invalid.`);
  }
  if (typeof value.durationMin !== "number") {
    throw new BackupError(`Backup ${path}.durationMin is invalid.`);
  }
  if (typeof value.loggedAt !== "string") {
    throw new BackupError(`Backup ${path}.loggedAt is invalid.`);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
