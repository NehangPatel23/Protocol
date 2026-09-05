/**
 * Cycle pointer — Master Prompt §2.7 / §2.8 / §6.1.
 * Pure functions: given state + today's local date, what day is due?
 */

import type { DayKey } from "./types";

export type CalendarStatus =
  | "completed"
  | "missed"
  | "rest"
  | "adhoc"
  | "recovery"
  | "blank";

export interface CalendarEntry {
  status: CalendarStatus;
  dayKey?: DayKey;
}

export interface CycleState {
  pointerIndex: number;
  lastCompletedDate: string | null;
  /** First calendar date the current pointer slot became due. */
  pendingSince: string;
  lastEvaluatedDate: string;
  /**
   * Explicit start. `false` = onboarding, never tag misses.
   * `undefined` on stored records = already in use (treat as started).
   */
  started?: boolean;
  recoveryRevert?: { date: string; pendingSince: string } | null;
  dayOverride?: { date: string; dayKey: DayKey } | null;
  /** pendingSince value for which the long-gap prompt was dismissed. */
  longGapDismissedFor?: string | null;
}

/** Spec §2.7: prompt after *more than* ~5 unexplained days (fires at 6). */
export const LONG_GAP_DAYS = 5;

export function addLocalDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function initialCycleState(today: string): CycleState {
  return {
    pointerIndex: 0,
    lastCompletedDate: null,
    pendingSince: today,
    lastEvaluatedDate: today,
    started: false,
    recoveryRevert: null,
    dayOverride: null,
    longGapDismissedFor: null,
  };
}

export function startProgram(today: string): CycleState {
  return {
    pointerIndex: 0,
    lastCompletedDate: null,
    pendingSince: today,
    lastEvaluatedDate: today,
    started: true,
    recoveryRevert: null,
    dayOverride: null,
    longGapDismissedFor: null,
  };
}

/**
 * Write-once cycle start date (§6.1). Boot must not call this.
 * Explicit start: keep an existing date, otherwise record `today`.
 */
export function nextCycleStartDate(
  existing: string | null,
  today: string,
): string {
  return existing ?? today;
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  const n = index % length;
  return n < 0 ? n + length : n;
}

function isStarted(state: CycleState): boolean {
  return state.started !== false;
}

/**
 * Advance through calendar days that have already passed: rest auto-advances
 * at midnight; an incomplete training day is tagged Missed once (on
 * pendingSince) and the pointer stays put.
 */
export function evaluateCycle(
  state: CycleState,
  today: string,
  cycleOrder: DayKey[],
): {
  state: CycleState;
  writes: { date: string; entry: CalendarEntry }[];
} {
  if (!isStarted(state)) {
    return {
      state: {
        ...state,
        started: false,
        pendingSince: today,
        lastEvaluatedDate: today,
      },
      writes: [],
    };
  }

  const n = cycleOrder.length;
  if (n === 0) return { state, writes: [] };

  let index = clampIndex(state.pointerIndex, n);
  let pendingSince = state.pendingSince;
  const lastCompleted = state.lastCompletedDate;
  let d = state.lastEvaluatedDate;
  const writes: { date: string; entry: CalendarEntry }[] = [];

  if (d > today) d = today;

  while (d < today) {
    const key = cycleOrder[index] ?? "rest";
    // Check lastCompleted before Rest. Finishing Legs (or any day before a
    // Rest slot) already advanced the pointer onto Rest and moved
    // pendingSince to tomorrow. If Rest is checked first, midnight would
    // treat that completed training date as the Rest day and skip Rest
    // entirely on the following calendar date.
    if (lastCompleted === d) {
      if (!(pendingSince > d)) {
        index = (index + 1) % n;
        pendingSince = addLocalDays(d, 1);
      }
    } else if (key === "rest") {
      writes.push({ date: d, entry: { status: "rest", dayKey: "rest" } });
      index = (index + 1) % n;
      pendingSince = addLocalDays(d, 1);
    } else if (d === pendingSince) {
      writes.push({ date: d, entry: { status: "missed", dayKey: key } });
    }
    d = addLocalDays(d, 1);
  }

  return {
    state: {
      ...state,
      pointerIndex: index,
      lastCompletedDate: lastCompleted,
      pendingSince,
      lastEvaluatedDate: today,
    },
    writes,
  };
}

export function isMissedPickup(state: CycleState, today: string, dayKey: DayKey): boolean {
  return dayKey !== "rest" && state.pendingSince < today;
}

/** After a logged training session — pointer moves to the next cycle slot. */
export function completeTrainingDay(
  state: CycleState,
  today: string,
  cycleLength: number,
): CycleState {
  const n = Math.max(cycleLength, 1);
  return {
    ...state,
    pointerIndex: (clampIndex(state.pointerIndex, n) + 1) % n,
    lastCompletedDate: today,
    pendingSince: addLocalDays(today, 1),
    lastEvaluatedDate: today,
  };
}

/**
 * Soreness swap (§2.8): pointer stays; pending training day moves to tomorrow.
 */
export function shiftPendingToTomorrow(state: CycleState, today: string): CycleState {
  return {
    ...state,
    pendingSince: addLocalDays(today, 1),
    lastEvaluatedDate: today,
    recoveryRevert: { date: today, pendingSince: state.pendingSince },
  };
}

/**
 * Same-day undo is allowed until another session is completed today
 * (Master Prompt §2.8).
 */
export function canRevertRecovery(state: CycleState, today: string): boolean {
  if (state.lastCompletedDate === today) return false;
  return state.pendingSince === addLocalDays(today, 1);
}

/** Same-day change of mind — restore the pending training day to today. */
export function revertPendingFromRecovery(
  state: CycleState,
  today: string,
): CycleState {
  return {
    ...state,
    pendingSince: state.recoveryRevert?.pendingSince ?? today,
    lastEvaluatedDate: today,
    recoveryRevert: null,
  };
}

/** No-op if the swap is no longer reversible. */
export function revertRecoveryDay(
  state: CycleState,
  today: string,
): CycleState {
  if (!canRevertRecovery(state, today)) return state;
  return revertPendingFromRecovery(state, today);
}

export function mondayOfWeek(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0 Sun … 6 Sat
  const offset = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + offset);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const EXPLAINED: ReadonlySet<CalendarStatus> = new Set([
  "recovery",
  "completed",
  "rest",
  "adhoc",
]);

/**
 * Unexplained pending days in [pendingSince, today). Recovery / completed /
 * rest / ad-hoc dates are explained and do not count (§2.8 / §6.1).
 */
export function unexplainedGapDays(
  state: CycleState,
  today: string,
  calendar: Record<string, CalendarEntry> = {},
): number {
  let unexplained = 0;
  let d = state.pendingSince;
  while (d < today) {
    const status = calendar[d]?.status;
    if (!status || !EXPLAINED.has(status)) unexplained += 1;
    d = addLocalDays(d, 1);
  }
  return unexplained;
}

export function shouldPromptLongGap(
  state: CycleState,
  today: string,
  calendar: Record<string, CalendarEntry> = {},
): boolean {
  if (!isStarted(state)) return false;
  if (state.longGapDismissedFor === state.pendingSince) return false;
  return unexplainedGapDays(state, today, calendar) > LONG_GAP_DAYS;
}

export function dismissLongGap(state: CycleState): CycleState {
  return { ...state, longGapDismissedFor: state.pendingSince };
}

export function jumpToDay(
  state: CycleState,
  today: string,
  cycleOrder: DayKey[],
  dayKey: DayKey,
): CycleState {
  const idx = cycleOrder.indexOf(dayKey);
  return {
    ...state,
    pointerIndex: idx >= 0 ? idx : state.pointerIndex,
    pendingSince: today,
    lastEvaluatedDate: today,
  };
}

/**
 * §6.1 "choose a different day": move the pointer to the chosen program day
 * without tagging the original pending calendar date as missed.
 */
export function chooseDifferentDay(
  state: CycleState,
  calendar: Record<string, CalendarEntry>,
  today: string,
  cycleOrder: DayKey[],
  chosenDayKey: DayKey,
): { state: CycleState; calendar: Record<string, CalendarEntry> } {
  return {
    state: jumpToDay(state, today, cycleOrder, chosenDayKey),
    calendar: { ...calendar },
  };
}

/**
 * Log the chosen (out-of-sequence) day. Does not resolve the original pending
 * calendar date — it stays blank. Flags the session so History can show a banner.
 */
export function logChosenDay(
  calendar: Record<string, CalendarEntry>,
  originalPendingDate: string,
  logDate: string,
  loggedDayKey: DayKey,
): {
  calendar: Record<string, CalendarEntry>;
  session: { date: string; dayKey: DayKey; outOfSequenceBanner: true };
} {
  void originalPendingDate;
  const next = { ...calendar };
  if (!next[logDate]) {
    next[logDate] = { status: "completed", dayKey: loggedDayKey };
  }
  return {
    calendar: next,
    session: {
      date: logDate,
      dayKey: loggedDayKey,
      outOfSequenceBanner: true,
    },
  };
}

/** Monday = cycle[0], matching the default PPL–Rest–UL–Rest week. */
export function weekdaySuggestedDay(
  dateKey: string,
  cycleOrder: DayKey[],
): DayKey {
  if (cycleOrder.length === 0) return "rest";
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const mondayIndex = day === 0 ? 6 : day - 1;
  return cycleOrder[mondayIndex % cycleOrder.length] ?? "rest";
}

export function setDayOverride(
  state: CycleState,
  date: string,
  dayKey: DayKey,
  naturalDayKey?: DayKey,
): CycleState {
  if (naturalDayKey !== undefined && dayKey === naturalDayKey) {
    return { ...state, dayOverride: null };
  }
  return { ...state, dayOverride: { date, dayKey } };
}

export function inferStarted(
  state: CycleState,
  calendar: Record<string, CalendarEntry>,
  cycleStartDate: string | null,
): boolean {
  if (state.started === true) return true;
  const hasEvidence = Object.values(calendar).some(
    (e) => e.status && e.status !== "blank",
  );
  if (hasEvidence) return true;
  // Explicit unstarted wins over a leftover prefs cycleStartDate — that
  // combination is the failed-persist case. Only startProgram may flip it.
  if (state.started === false) return false;
  if (cycleStartDate) return true;
  return false;
}

export interface CyclePersistence {
  save: (state: CycleState) => Promise<void>;
  load: () => Promise<CycleState | undefined>;
}

/**
 * The only in-memory producer of `started: true`. Always goes through
 * `startProgram` — never infer from prefs or a re-render flag.
 */
export function explicitStartState(
  today: string,
  cycleOrder: DayKey[],
): CycleState {
  const next = evaluateCycle(startProgram(today), today, cycleOrder).state;
  if (next.started !== true) {
    throw new Error("[protocol/cycle] startProgram did not set started: true");
  }
  return next;
}

/**
 * Write the explicit start, then re-read the store. Throws if the re-read
 * is still unstarted so callers cannot paint a started UI over a failed write.
 */
export async function persistExplicitStart(
  today: string,
  cycleOrder: DayKey[],
  persistence: CyclePersistence,
): Promise<CycleState> {
  const next = explicitStartState(today, cycleOrder);
  await persistence.save(next);
  const stored = await persistence.load();
  if (stored?.started !== true) {
    throw new Error("[protocol/cycle] start did not persist started: true");
  }
  return stored;
}

/**
 * Boot composition — never calls `startProgram`. First-ever (no stored cycle,
 * no calendar evidence, no cycleStartDate) stays unstarted and writes nothing.
 */
export function bootCycle(
  stored: CycleState | null | undefined,
  calendar: Record<string, CalendarEntry>,
  cycleStartDate: string | null,
  today: string,
  cycleOrder: DayKey[],
): {
  state: CycleState;
  writes: { date: string; entry: CalendarEntry }[];
} {
  const base = stored ?? initialCycleState(today);
  const started = inferStarted(base, calendar, cycleStartDate);
  return evaluateCycle({ ...base, started }, today, cycleOrder);
}
