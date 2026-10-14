/**
 * The only Finish Workout path. Calls `completeTrainingDay` — it does not
 * reimplement pointer math or invent a parallel "mark complete".
 */

import { mergeSessionRecord, type SessionRecord } from "@/lib/db/cardio";
import { markTrainingDayDone } from "@/lib/db/cycle";
import type { StoreWrite } from "@/lib/db/index";
import {
  buildCompletionRevert,
  completeTrainingDay,
  logChosenDay,
  withCompletionRevert,
  type CalendarEntry,
  type CycleState,
} from "@/lib/program/cycle";
import type { DayKey } from "@/lib/program/types";
import { sessionFromLogChosenDay } from "@/lib/session/chooseDay";

export interface SessionClock {
  startedAt: string;
  finishedAt: string;
}

const CYCLE_KEY = "state";
const CALENDAR_KEY = "days";
const ACTIVE_SESSION_KEY = "current";

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
  loadCycle: () => Promise<CycleState | undefined>;
  loadCalendar: () => Promise<Record<string, CalendarEntry>>;
  loadSession?: (date: string) => Promise<SessionRecord | undefined>;
  /**
   * Single IndexedDB (or test) transaction across calendar, cycle, sessions,
   * and activeSession. All writes commit together or none do.
   */
  commitWrites: (writes: StoreWrite[]) => Promise<void>;
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
 * Persist Finish in one multi-store transaction: calendar completed, cycle
 * advanced with `completionRevert` snapshot, sessions timestamps, clear
 * activeSession. Re-reads after commit to confirm. Throws if verification fails.
 */
export async function persistFinishedWorkout(
  cycle: CycleState,
  calendar: Record<string, CalendarEntry>,
  date: string,
  dayKey: DayKey,
  cycleLength: number,
  persistence: FinishWorkoutPersistence,
  originalPendingDate?: string | null,
  clock?: SessionClock,
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

  const existing = persistence.loadSession
    ? await persistence.loadSession(date)
    : undefined;
  const sessionBannerState = existing?.outOfSequenceBanner === true;
  // Snapshot pre-Finish cycle — includes lastEvaluatedDate. Replaces any
  // prior completionRevert so a stale snapshot cannot fire after a new Finish.
  const revert = buildCompletionRevert(
    cycle,
    date,
    dayKey,
    sessionBannerState,
  );

  const applied = pendingFrom
    ? applyOutOfSequenceFinish(
        cycle,
        calendar,
        date,
        dayKey,
        cycleLength,
        pendingFrom,
      )
    : {
        ...applyFinishWorkout(cycle, calendar, date, dayKey, cycleLength),
        session: null as null | {
          date: string;
          dayKey: DayKey;
          outOfSequenceBanner: true;
        },
      };

  if (applied.calendar[date]?.status !== "completed") {
    throw new Error(
      "[protocol/session] finish did not persist calendar completed",
    );
  }

  const cycleToSave = withCompletionRevert(applied.cycle, revert);

  const withBanner = applied.session
    ? sessionFromLogChosenDay(existing, applied.session)
    : existing;
  const sessionToSave = mergeSessionRecord(withBanner, {
    date,
    dayKey,
    complete: true,
    startedAt: clock?.startedAt,
    finishedAt: clock?.finishedAt,
  });

  const writes: StoreWrite[] = [
    {
      op: "put",
      store: "calendar",
      key: CALENDAR_KEY,
      value: applied.calendar,
    },
    { op: "put", store: "cycle", key: CYCLE_KEY, value: cycleToSave },
    { op: "put", store: "sessions", key: date, value: sessionToSave },
    { op: "delete", store: "activeSession", key: ACTIVE_SESSION_KEY },
  ];

  await persistence.commitWrites(writes);

  const storedCal = await persistence.loadCalendar();
  if (storedCal[date]?.status !== "completed") {
    throw new Error(
      "[protocol/session] finish did not persist calendar completed",
    );
  }

  const storedCycle = await persistence.loadCycle();
  if (!storedCycle) {
    throw new Error("[protocol/session] finish did not persist cycle");
  }
  if (storedCycle.pointerIndex !== cycleToSave.pointerIndex) {
    throw new Error(
      "[protocol/session] finish did not persist pointer advance",
    );
  }
  if (storedCycle.lastCompletedDate !== date) {
    throw new Error(
      "[protocol/session] finish did not persist lastCompletedDate",
    );
  }
  if (
    !storedCycle.completionRevert ||
    storedCycle.completionRevert.date !== date ||
    storedCycle.completionRevert.lastEvaluatedDate !== revert.lastEvaluatedDate
  ) {
    throw new Error(
      "[protocol/session] finish did not persist completionRevert",
    );
  }

  return { cycle: storedCycle, calendar: storedCal };
}
