import type { CalendarEntry, CycleState } from "@/lib/program/cycle";
import { BackupError } from "./types";

/** Latest calendar date with status === "completed", or null if none. */
export function latestCompletedCalendarDate(
  calendar: Record<string, CalendarEntry>,
): string | null {
  let latest: string | null = null;
  for (const [date, entry] of Object.entries(calendar)) {
    if (entry.status !== "completed") continue;
    if (latest == null || date > latest) latest = date;
  }
  return latest;
}

/**
 * cycle.lastCompletedDate must equal the latest completed calendar date
 * (both null is OK). Reject inconsistent backups before any write.
 */
export function assertCycleCalendarConsistent(
  cycle: CycleState,
  calendar: Record<string, CalendarEntry>,
): void {
  const latest = latestCompletedCalendarDate(calendar);
  if (cycle.lastCompletedDate === latest) return;
  throw new BackupError(
    `Backup is inconsistent: cycle.lastCompletedDate (${formatNullable(
      cycle.lastCompletedDate,
    )}) does not match the latest completed calendar day (${formatNullable(
      latest,
    )}).`,
  );
}

function formatNullable(value: string | null): string {
  return value == null ? "none" : value;
}
