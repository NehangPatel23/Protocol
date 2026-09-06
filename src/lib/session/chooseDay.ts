/**
 * "Choose a different day" — Master Prompt §6.1.
 * Calls `chooseDifferentDay` / `logChosenDay`. Does not reimplement skip-vs-miss.
 */

import type { SessionRecord } from "@/lib/db/cardio";
import {
  chooseDifferentDay,
  type CalendarEntry,
  type CycleState,
} from "@/lib/program/cycle";
import type { DayKey } from "@/lib/program/types";

export interface ChooseDayPersistence {
  saveCycle: (state: CycleState) => Promise<void>;
  loadCycle: () => Promise<CycleState | undefined>;
}

/**
 * Jump the pointer via `chooseDifferentDay` and remember the original
 * pending date so Finish can call `logChosenDay` on the same path.
 */
export async function persistChooseDifferentDay(
  cycle: CycleState,
  calendar: Record<string, CalendarEntry>,
  today: string,
  cycleOrder: DayKey[],
  chosenDayKey: DayKey,
  persistence: ChooseDayPersistence,
): Promise<CycleState> {
  const originalPending = cycle.pendingSince;
  const applied = chooseDifferentDay(
    cycle,
    calendar,
    today,
    cycleOrder,
    chosenDayKey,
  );
  const next: CycleState = {
    ...applied.state,
    outOfSequenceFrom: originalPending,
  };
  await persistence.saveCycle(next);
  const stored = await persistence.loadCycle();
  if (!stored) {
    throw new Error("[protocol/session] choose-day did not persist cycle");
  }
  if (stored.pointerIndex !== next.pointerIndex) {
    throw new Error("[protocol/session] choose-day did not persist pointer");
  }
  if (stored.outOfSequenceFrom !== originalPending) {
    throw new Error(
      "[protocol/session] choose-day did not persist outOfSequenceFrom",
    );
  }
  if (stored.pendingSince !== today) {
    throw new Error(
      "[protocol/session] choose-day did not persist pendingSince",
    );
  }
  return stored;
}

/** Merge `logChosenDay`'s session flag onto the sessions store record. */
export function sessionFromLogChosenDay(
  existing: SessionRecord | undefined,
  logged: { date: string; dayKey: DayKey; outOfSequenceBanner: true },
): SessionRecord {
  return {
    date: logged.date,
    dayKey: logged.dayKey,
    type: existing?.type ?? "program",
    entries: existing?.entries ?? [],
    cardio: existing?.cardio ?? null,
    durationMin: existing?.durationMin,
    notes: existing?.notes,
    complete: true,
    outOfSequenceBanner: logged.outOfSequenceBanner,
  };
}
