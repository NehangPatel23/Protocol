import type { CycleState } from "@/lib/program/cycle";
import type { CalendarEntry } from "@/lib/program/cycle";
import type { HistoryEntry } from "@/lib/db/history";
import type { SessionRecord } from "@/lib/db/cardio";

/**
 * Device is "empty" for restore when ALL of:
 * - no calendar days
 * - no sessions
 * - no exerciseHistory entries
 * - cycle is missing OR cycle.started === false
 *
 * Default first-boot writes (prefs, cycleStartDate, seeded program) do NOT
 * count. Legacy cycle records with `started` undefined are treated as started
 * (not empty), matching bootCycle's "already in use" rule.
 */
export function isDeviceEmpty(input: {
  calendar: Record<string, CalendarEntry>;
  sessions: Record<string, SessionRecord>;
  exerciseHistory: Record<string, HistoryEntry[]>;
  cycle: CycleState | undefined;
}): boolean {
  if (Object.keys(input.calendar).length > 0) return false;
  if (Object.keys(input.sessions).length > 0) return false;
  if (Object.keys(input.exerciseHistory).length > 0) return false;
  if (input.cycle != null && input.cycle.started !== false) return false;
  return true;
}

export const DEVICE_NOT_EMPTY_MESSAGE =
  "This device already has data. Restore is only available on a fresh install.";
