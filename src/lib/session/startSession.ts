/**
 * Start Workout — Master Prompt §6.14 double-tap guard.
 * One in-flight create; an existing session is resumed, never replaced.
 */

import {
  createActiveSession,
  type ActiveSessionState,
} from "@/lib/db/activeSession";
import type { CalendarEntry } from "@/lib/program/cycle";
import type { DayKey } from "@/lib/program/types";

export function coalesceInflight<T>(): (fn: () => Promise<T>) => Promise<T> {
  let current: Promise<T> | null = null;
  return (fn) => {
    if (!current) {
      current = Promise.resolve()
        .then(fn)
        .finally(() => {
          current = null;
        });
    }
    return current;
  };
}

export interface StartSessionInput {
  existing: ActiveSessionState | null | undefined;
  date: string;
  dayKey: DayKey;
  calendar: Record<string, CalendarEntry>;
  programStarted: boolean;
}

export interface StartSessionPersistence {
  save: (state: ActiveSessionState) => Promise<void>;
  load: () => Promise<ActiveSessionState | undefined>;
}

export async function persistStartedSession(
  input: StartSessionInput,
  persistence: StartSessionPersistence,
): Promise<ActiveSessionState> {
  if (input.existing) return input.existing;
  const storedExisting = await persistence.load();
  if (storedExisting) return storedExisting;
  if (!input.programStarted) {
    throw new Error(
      "[protocol/program] cannot start a session before the program",
    );
  }
  if (input.dayKey === "rest") {
    throw new Error("[protocol/program] rest days have no session");
  }
  const status = input.calendar[input.date]?.status;
  if (status === "completed") {
    throw new Error("[protocol/program] today is already completed");
  }
  if (status === "recovery") {
    throw new Error(
      "[protocol/program] revert recovery before starting a session",
    );
  }
  const next = createActiveSession(input.date, input.dayKey);
  await persistence.save(next);
  const stored = await persistence.load();
  if (!stored || stored.date !== input.date || stored.dayKey !== input.dayKey) {
    throw new Error("[protocol/program] session start did not persist");
  }
  return stored;
}
