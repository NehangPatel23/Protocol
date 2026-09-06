/**
 * The only Finish Workout path. Calls `completeTrainingDay` — it does not
 * reimplement pointer math or invent a parallel "mark complete".
 */

import type { SessionRecord } from "@/lib/db/cardio";
import { markTrainingDayDone } from "@/lib/db/cycle";
import {
  completeTrainingDay,
  logChosenDay,
  type CalendarEntry,
  type CycleState,
} from "@/lib/program/cycle";
import type { DayKey } from "@/lib/program/types";
import { sessionFromLogChosenDay } from "@/lib/session/chooseDay";

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
  saveSession?: (record: SessionRecord) => Promise<void>;
  loadSession?: (date: string) => Promise<SessionRecord | undefined>;
}

/**
 * Same `completeTrainingDay` write as a normal finish, then `logChosenDay`
 * so the original pending date stays blank and the session carries the banner.
 */
export function applyOutOfSequenceFinish(
  cycle: CycleState,
  calendar: Record<string, CalendarEntry>,
  date: string,
  dayKey: DayKey,
  cycleLength: number,
  originalPendingDate: string,
): {
  cycle: CycleState;
  calendar: Record<string, CalendarEntry>;
  session: { date: string; dayKey: DayKey; outOfSequenceBanner: true };
} {
  const finished = applyFinishWorkout(
    cycle,
    calendar,
    date,
    dayKey,
    cycleLength,
  );
  const logged = logChosenDay(
    finished.calendar,
    originalPendingDate,
    date,
    dayKey,
  );
  return {
    cycle: { ...finished.cycle, outOfSequenceFrom: null },
    calendar: logged.calendar,
    session: logged.session,
  };
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
  originalPendingDate?: string | null,
): Promise<{ cycle: CycleState; calendar: Record<string, CalendarEntry> }> {
  if (isSettled(calendar, date)) {
    throw new Error(
      "[protocol/session] finish refused: date is already settled",
    );
  }

  const pendingFrom =
    originalPendingDate != null && originalPendingDate !== ""
      ? originalPendingDate
      : null;
  if (pendingFrom && !persistence.saveSession) {
    throw new Error(
      "[protocol/session] out-of-sequence finish needs saveSession",
    );
  }

  const applied = pendingFrom
    ? applyOutOfSequenceFinish(
        cycle,
        calendar,
        date,
        dayKey,
        cycleLength,
        pendingFrom,
      )
    : { ...applyFinishWorkout(cycle, calendar, date, dayKey, cycleLength), session: null };

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
  if (applied.session) {
    const existing = persistence.loadSession
      ? await persistence.loadSession(date)
      : undefined;
    await persistence.saveSession!(
      sessionFromLogChosenDay(existing, applied.session),
    );
  }
  await persistence.clearActiveSession();
  return { cycle: storedCycle, calendar: storedCal };
}
