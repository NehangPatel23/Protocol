/**
 * Period-over-period: last 28 calendar days vs the 28 before.
 * Both windows must contain working sets — never compare real weeks to empty ones.
 */

import type { HistoryEntry } from "@/lib/db/history";
import { addLocalDays } from "@/lib/program/cycle";
import type { ProgramRecord } from "@/lib/program/types";
import {
  bestPRFromHistory,
  warmupPrescriptionFor,
  type PersonalRecord,
} from "./prs";
import {
  inDateRange,
  isWorkingSet,
  volumePerMuscleInRange,
  type MuscleVolume,
} from "./volume";

export const PERIOD_LENGTH_DAYS = 28;

export interface DateRange {
  start: string;
  end: string;
}

export interface PeriodWindows {
  recent: DateRange;
  previous: DateRange;
}

export function periodWindows(today: string): PeriodWindows {
  const recentEnd = today;
  const recentStart = addLocalDays(today, -(PERIOD_LENGTH_DAYS - 1));
  const previousEnd = addLocalDays(recentStart, -1);
  const previousStart = addLocalDays(previousEnd, -(PERIOD_LENGTH_DAYS - 1));
  return {
    recent: { start: recentStart, end: recentEnd },
    previous: { start: previousStart, end: previousEnd },
  };
}

export function windowHasWorkingSets(
  history: Record<string, HistoryEntry[]>,
  program: ProgramRecord,
  range: DateRange,
): boolean {
  for (const [exerciseId, entries] of Object.entries(history)) {
    const warmup = warmupPrescriptionFor(program, exerciseId);
    for (const entry of entries) {
      if (!inDateRange(entry.date, range.start, range.end)) continue;
      for (const set of entry.sets) {
        if (isWorkingSet(set, warmup)) return true;
      }
    }
  }
  return false;
}

/**
 * True only when both 4-week windows have at least one working set.
 * A set 60 days ago plus a set this week is enough; 6 weeks of logging is not.
 */
export function hasEnoughPeriodHistory(
  history: Record<string, HistoryEntry[]>,
  program: ProgramRecord,
  today: string,
): boolean {
  const windows = periodWindows(today);
  return (
    windowHasWorkingSets(history, program, windows.previous) &&
    windowHasWorkingSets(history, program, windows.recent)
  );
}

export interface MusclePeriodRow {
  muscle: MuscleVolume["muscle"];
  label: string;
  recentSets: number;
  previousSets: number;
}

export function compareMuscleVolume(
  history: Record<string, HistoryEntry[]>,
  program: ProgramRecord,
  today: string,
): MusclePeriodRow[] {
  const windows = periodWindows(today);
  const recent = volumePerMuscleInRange(
    history,
    program,
    windows.recent.start,
    windows.recent.end,
  );
  const previous = volumePerMuscleInRange(
    history,
    program,
    windows.previous.start,
    windows.previous.end,
  );
  const prevMap = new Map(previous.map((r) => [r.muscle, r.sets]));
  const recentMap = new Map(recent.map((r) => [r.muscle, r.sets]));
  const muscles = new Set([...recentMap.keys(), ...prevMap.keys()]);
  const rows: MusclePeriodRow[] = [];
  for (const muscle of muscles) {
    const label =
      recent.find((r) => r.muscle === muscle)?.label ??
      previous.find((r) => r.muscle === muscle)?.label ??
      muscle;
    rows.push({
      muscle,
      label,
      recentSets: recentMap.get(muscle) ?? 0,
      previousSets: prevMap.get(muscle) ?? 0,
    });
  }
  rows.sort(
    (a, b) =>
      Math.abs(b.recentSets - b.previousSets) -
        Math.abs(a.recentSets - a.previousSets) ||
      a.label.localeCompare(b.label),
  );
  return rows;
}

export interface ExercisePeriodRow {
  exerciseId: string;
  name: string;
  recentSets: number;
  previousSets: number;
  recentBest: PersonalRecord | null;
  previousBest: PersonalRecord | null;
}

function countWorkingSets(
  entries: HistoryEntry[],
  range: DateRange,
  warmup: ReturnType<typeof warmupPrescriptionFor>,
): number {
  let count = 0;
  for (const entry of entries) {
    if (!inDateRange(entry.date, range.start, range.end)) continue;
    for (const set of entry.sets) {
      if (isWorkingSet(set, warmup)) count += 1;
    }
  }
  return count;
}

function entriesInRange(
  entries: HistoryEntry[],
  range: DateRange,
): HistoryEntry[] {
  return entries.filter((e) => inDateRange(e.date, range.start, range.end));
}

export function compareExerciseVolume(
  history: Record<string, HistoryEntry[]>,
  program: ProgramRecord,
  today: string,
): ExercisePeriodRow[] {
  const windows = periodWindows(today);
  const rows: ExercisePeriodRow[] = [];
  for (const [exerciseId, entries] of Object.entries(history)) {
    const lib = program.exercises[exerciseId];
    if (!lib) continue;
    const warmup = warmupPrescriptionFor(program, exerciseId);
    const recentSets = countWorkingSets(entries, windows.recent, warmup);
    const previousSets = countWorkingSets(entries, windows.previous, warmup);
    if (recentSets === 0 && previousSets === 0) continue;
    const prType = lib.prType ?? "weight";
    rows.push({
      exerciseId,
      name: lib.name,
      recentSets,
      previousSets,
      recentBest: bestPRFromHistory(
        entriesInRange(entries, windows.recent),
        prType,
        warmup,
      ),
      previousBest: bestPRFromHistory(
        entriesInRange(entries, windows.previous),
        prType,
        warmup,
      ),
    });
  }
  rows.sort(
    (a, b) =>
      Math.abs(b.recentSets - b.previousSets) -
        Math.abs(a.recentSets - a.previousSets) || a.name.localeCompare(b.name),
  );
  return rows;
}

/** Null when previous is 0 — caller should say "new", not +Infinity. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function formatPeriodDelta(current: number, previous: number): string {
  if (previous === 0 && current > 0) return "new";
  if (previous > 0 && current === 0) return "none this period";
  const pct = percentChange(current, previous);
  if (pct == null) return "0%";
  const rounded = Math.round(pct);
  if (rounded === 0) return "0%";
  return rounded > 0 ? `+${rounded}%` : `${rounded}%`;
}
