/** In-progress workout — Master Prompt §6.3 / §6.14. One record, key `current`. */

import { deleteStoreValue, getStoreValue, setStoreValue } from "./index";
import type { DayKey } from "@/lib/program/types";

const CURRENT_KEY = "current";

export interface ActiveSessionState {
  /** Calendar date locked at Start Workout — never reassigned after midnight. */
  date: string;
  dayKey: DayKey;
  /** Index into the session step list (lifts, then optional cardio). */
  currentStep: number;
  startedAt: string;
  /** ISO end time for the rest timer; remaining is computed from this, not an interval. */
  restEndsAt: string | null;
  /** Original rest length, for the countdown ring. */
  restDurationSec: number | null;
}

export async function loadActiveSession(): Promise<ActiveSessionState | undefined> {
  return getStoreValue<ActiveSessionState>("activeSession", CURRENT_KEY);
}

export async function saveActiveSession(
  state: ActiveSessionState,
): Promise<void> {
  await setStoreValue("activeSession", CURRENT_KEY, state);
}

export async function clearActiveSession(): Promise<void> {
  await deleteStoreValue("activeSession", CURRENT_KEY);
}

export function createActiveSession(
  date: string,
  dayKey: DayKey,
  now = new Date(),
): ActiveSessionState {
  return {
    date,
    dayKey,
    currentStep: 0,
    startedAt: now.toISOString(),
    restEndsAt: null,
    restDurationSec: null,
  };
}
