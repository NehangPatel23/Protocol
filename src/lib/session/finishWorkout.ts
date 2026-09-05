/**
 * The only Finish Workout path. Calls `completeTrainingDay` — it does not
 * reimplement pointer math or invent a parallel "mark complete".
 */

import { markTrainingDayDone } from "@/lib/db/cycle";
import {
  completeTrainingDay,
  type CalendarEntry,
  type CycleState,
} from "@/lib/program/cycle";
import type { DayKey } from "@/lib/program/types";

function isSettled(
  calendar: Record<string, CalendarEntry>,
  date: string,
): boolean {
  const status = calendar[date]?.status;
  return Boolean(status && status !== "blank");
}

export function applyFinishWorkout(
  cycle: CycleState,
  calendar: Record<string, CalendarEntry>,
  date: string,
  dayKey: DayKey,
  cycleLength: number,
): { cycle: CycleState; calendar: Record<string, CalendarEntry> } {
  if (isSettled(calendar, date)) {
    // Three-way exclusivity: never clobber recovery/missed/rest, and never
    // advance the pointer when the calendar write is refused.
    return { cycle, calendar };
  }
  return {
    cycle: completeTrainingDay(cycle, date, cycleLength),
    calendar: markTrainingDayDone(calendar, date, dayKey),
  };
}

export interface FinishWorkoutPersistence {
  saveCycle: (state: CycleState) => Promise<void>;
  loadCycle: () => Promise<CycleState | undefined>;
  saveCalendar: (
    calendar: Record<string, CalendarEntry>,
  ) => Promise<void>;
  loadCalendar: () => Promise<Record<string, CalendarEntry>>;
  clearActiveSession: () => Promise<void>;
}

/**
 * Persist the `completeTrainingDay` result, re-read it, then drop the
 * in-progress session record. Throws if the store does not show completed.
 *
 * Calendar is written and confirmed before the cycle pointer is saved, so a
 * refused calendar write (e.g. recovery already on that date) cannot leave an
 * advanced pointer in IndexedDB. Callers must not paint until this resolves.
 */
export async function persistFinishedWorkout(
  cycle: CycleState,
  calendar: Record<string, CalendarEntry>,
  date: string,
  dayKey: DayKey,
  cycleLength: number,
  persistence: FinishWorkoutPersistence,
): Promise<{ cycle: CycleState; calendar: Record<string, CalendarEntry> }> {
  if (isSettled(calendar, date)) {
    throw new Error(
      "[protocol/session] finish refused: date is already settled",
    );
  }

  const applied = applyFinishWorkout(cycle, calendar, date, dayKey, cycleLength);
  if (applied.calendar[date]?.status !== "completed") {
    throw new Error(
      "[protocol/session] finish did not persist calendar completed",
    );
  }

  await persistence.saveCalendar(applied.calendar);
  const storedCal = await persistence.loadCalendar();
  if (storedCal[date]?.status !== "completed") {
    throw new Error(
      "[protocol/session] finish did not persist calendar completed",
    );
  }

  await persistence.saveCycle(applied.cycle);
  const storedCycle = await persistence.loadCycle();
  if (!storedCycle) {
    throw new Error("[protocol/session] finish did not persist cycle");
  }
  if (storedCycle.pointerIndex !== applied.cycle.pointerIndex) {
    throw new Error(
      "[protocol/session] finish did not persist pointer advance",
    );
  }
  if (storedCycle.lastCompletedDate !== date) {
    throw new Error(
      "[protocol/session] finish did not persist lastCompletedDate",
    );
  }
  await persistence.clearActiveSession();
  return { cycle: storedCycle, calendar: storedCal };
}
