/**
 * Pure History read-model. Stage 2 only derives display from stores —
 * it does not write calendar / cycle / exerciseHistory.
 */

import type { SessionRecord } from "@/lib/db/cardio";
import type { HistoryEntry, HistorySet } from "@/lib/db/history";
import {
  addLocalDays,
  mondayOfWeek,
  type CalendarEntry,
  type CalendarStatus,
} from "@/lib/program/cycle";
import type { DayKey, PRType, ProgramRecord } from "@/lib/program/types";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export const MONTH_WEEKDAY_LABELS = WEEKDAYS;

export interface MonthCell {
  /** YYYY-MM-DD when this slot is in the shown month; null = leading/trailing pad. */
  date: string | null;
  dayNum: number | null;
  weekdayLabel: (typeof WEEKDAYS)[number];
}

export function monthStart(year: number, monthIndex: number): string {
  const mm = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${mm}-01`;
}

export function addMonths(year: number, monthIndex: number, delta: number): {
  year: number;
  monthIndex: number;
} {
  const d = new Date(year, monthIndex + delta, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

export function monthTitle(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** Monday-first month grid, padded so the 1st lands on the correct weekday. */
export function monthGrid(year: number, monthIndex: number): MonthCell[] {
  const first = monthStart(year, monthIndex);
  const gridStart = mondayOfWeek(first);
  const next = addMonths(year, monthIndex, 1);
  const nextFirst = monthStart(next.year, next.monthIndex);
  const cells: MonthCell[] = [];
  let date = gridStart;
  // Always 6 weeks so the heatmap height is stable across months.
  for (let i = 0; i < 42; i++) {
    const inMonth = date >= first && date < nextFirst;
    cells.push({
      date: inMonth ? date : null,
      dayNum: inMonth ? Number(date.slice(8)) : null,
      weekdayLabel: WEEKDAYS[i % 7],
    });
    date = addLocalDays(date, 1);
  }
  return cells;
}

export function calendarStatusForDate(
  calendar: Record<string, CalendarEntry>,
  date: string | null,
): CalendarStatus | "blank" {
  if (!date) return "blank";
  return calendar[date]?.status ?? "blank";
}

export interface DayExerciseLog {
  exerciseId: string;
  name: string;
  prType: PRType;
  sets: HistorySet[];
  dayKey?: DayKey;
}

export interface HistorySessionItem {
  date: string;
  dayKey?: DayKey;
  status: Extract<CalendarStatus, "completed" | "recovery">;
  exercises: DayExerciseLog[];
  /** Only present when the sessions store actually has it (cardio path). */
  durationMin?: number;
  cardioActivity?: string;
}

function exercisesOnDate(
  history: Record<string, HistoryEntry[]>,
  program: ProgramRecord,
  date: string,
): DayExerciseLog[] {
  const rows: DayExerciseLog[] = [];
  for (const [exerciseId, entries] of Object.entries(history)) {
    const entry = entries.find((e) => e.date === date);
    if (!entry || entry.sets.length === 0) continue;
    const lib = program.exercises[exerciseId];
    rows.push({
      exerciseId,
      name: lib?.name ?? exerciseId,
      prType: lib?.prType ?? "weight",
      sets: entry.sets,
      dayKey: entry.dayKey,
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

function sessionDayKey(
  date: string,
  calendar: Record<string, CalendarEntry>,
  session: SessionRecord | undefined,
  exercises: DayExerciseLog[],
): DayKey | undefined {
  return (
    calendar[date]?.dayKey ??
    session?.dayKey ??
    exercises.find((e) => e.dayKey)?.dayKey
  );
}

/**
 * Session list membership is calendar-gated: only `completed` and
 * `recovery` dates. exerciseHistory / sessions fill in sets and
 * duration for those dates — they do not create a row on their own.
 * Deleting a calendar entry must drop the list row even if leftover
 * history or a session stub remains.
 */
export function buildSessionList(
  calendar: Record<string, CalendarEntry>,
  history: Record<string, HistoryEntry[]>,
  sessions: Record<string, SessionRecord>,
  program: ProgramRecord,
): HistorySessionItem[] {
  const items: HistorySessionItem[] = [];
  for (const [date, entry] of Object.entries(calendar)) {
    if (entry.status !== "completed" && entry.status !== "recovery") continue;
    const session = sessions[date];
    const exercises = exercisesOnDate(history, program, date);
    const item: HistorySessionItem = {
      date,
      dayKey: sessionDayKey(date, calendar, session, exercises),
      status: entry.status,
      exercises,
    };
    if (typeof session?.durationMin === "number") {
      item.durationMin = session.durationMin;
    }
    if (session?.cardio?.activity) {
      item.cardioActivity = session.cardio.activity;
    }
    items.push(item);
  }
  items.sort((a, b) => b.date.localeCompare(a.date));
  return items;
}

export function sessionsInMonth(
  items: HistorySessionItem[],
  year: number,
  monthIndex: number,
): HistorySessionItem[] {
  const prefix = monthStart(year, monthIndex).slice(0, 7);
  return items.filter((s) => s.date.startsWith(prefix));
}

export function sessionForDate(
  items: HistorySessionItem[],
  date: string | null,
): HistorySessionItem | undefined {
  if (!date) return undefined;
  return items.find((s) => s.date === date);
}

export function formatSessionDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
