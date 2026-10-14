/**
 * Same-day Undo completion — restores cycle + calendar from `completionRevert`
 * in a single IndexedDB transaction. Logged sets in exerciseHistory are untouched.
 */

import type { SessionRecord } from "@/lib/db/cardio";
import type { StoreWrite } from "@/lib/db/index";
import {
  applyUndoCompletion,
  canUndoCompletion,
  type CalendarEntry,
  type CycleState,
} from "@/lib/program/cycle";
import type { DayKey } from "@/lib/program/types";

const CYCLE_KEY = "state";
const CALENDAR_KEY = "days";

export interface UndoCompletionPersistence {
  loadCycle: () => Promise<CycleState | undefined>;
  loadCalendar: () => Promise<Record<string, CalendarEntry>>;
  loadSession?: (date: string) => Promise<SessionRecord | undefined>;
  /** Single multi-store transaction — all writes commit or none do. */
  commitWrites: (writes: StoreWrite[]) => Promise<void>;
}

/**
 * Clear Finish timestamps / complete. Delete the sessions row when it only
 * held Finish metadata (no cardio, notes, duration, or entries) — sets live
 * in exerciseHistory and are not stored here.
 */
export function sessionAfterUndoCompletion(
  existing: SessionRecord | undefined,
  date: string,
  dayKey: DayKey,
  sessionBannerState: boolean,
): SessionRecord | "delete" | "noop" {
  if (!existing) return "noop";
  const hasSubstance =
    (existing.entries?.length ?? 0) > 0 ||
    existing.cardio != null ||
    (existing.notes != null && existing.notes !== "") ||
    typeof existing.durationMin === "number";
  if (!hasSubstance) return "delete";

  const next: SessionRecord = {
    date,
    dayKey: existing.dayKey ?? dayKey,
    type: existing.type ?? "program",
    entries: existing.entries ?? [],
    cardio: existing.cardio ?? null,
    complete: false,
  };
  if (existing.notes != null) next.notes = existing.notes;
  if (typeof existing.durationMin === "number") {
    next.durationMin = existing.durationMin;
  }
  // Omit startedAt / finishedAt. Restore pre-Finish banner flag only.
  if (sessionBannerState) next.outOfSequenceBanner = true;
  return next;
}

export async function persistUndoCompletion(
  cycle: CycleState,
  calendar: Record<string, CalendarEntry>,
  today: string,
  persistence: UndoCompletionPersistence,
): Promise<{ cycle: CycleState; calendar: Record<string, CalendarEntry> }> {
  if (!canUndoCompletion(cycle, calendar, today)) {
    throw new Error("[protocol/session] undo completion refused");
  }

  const applied = applyUndoCompletion(cycle, calendar, today);
  const existing = persistence.loadSession
    ? await persistence.loadSession(today)
    : undefined;
  const sessionNext = sessionAfterUndoCompletion(
    existing,
    today,
    applied.revert.dayKey,
    applied.revert.sessionBannerState,
  );

  const writes: StoreWrite[] = [
    { op: "put", store: "calendar", key: CALENDAR_KEY, value: applied.calendar },
    { op: "put", store: "cycle", key: CYCLE_KEY, value: applied.cycle },
  ];
  if (sessionNext === "delete") {
    writes.push({ op: "delete", store: "sessions", key: today });
  } else if (sessionNext !== "noop") {
    writes.push({
      op: "put",
      store: "sessions",
      key: today,
      value: sessionNext,
    });
  }

  await persistence.commitWrites(writes);

  const storedCal = await persistence.loadCalendar();
  const storedCycle = await persistence.loadCycle();
  if (storedCal[today]?.status === "completed") {
    throw new Error(
      "[protocol/session] undo did not clear calendar completed",
    );
  }
  if (!storedCycle) {
    throw new Error("[protocol/session] undo did not persist cycle");
  }
  if (storedCycle.completionRevert != null) {
    throw new Error("[protocol/session] undo left completionRevert set");
  }
  if (storedCycle.pointerIndex !== applied.cycle.pointerIndex) {
    throw new Error("[protocol/session] undo did not restore pointer");
  }
  if (storedCycle.lastEvaluatedDate !== applied.revert.lastEvaluatedDate) {
    throw new Error(
      "[protocol/session] undo did not restore lastEvaluatedDate",
    );
  }
  if (storedCycle.lastCompletedDate !== applied.revert.lastCompletedDate) {
    throw new Error(
      "[protocol/session] undo did not restore lastCompletedDate",
    );
  }

  return { cycle: storedCycle, calendar: storedCal };
}
