/**
 * Weekly volume per muscle — Master Prompt §6.4.
 * Rolling trailing 7 calendar days (today + 6 prior), not Mon–Sun.
 * Primary muscles: 1.0 set; secondary: 0.5. Warm-ups excluded.
 */

import type { HistoryEntry, HistorySet } from "@/lib/db/history";
import { addLocalDays, daysBetween } from "@/lib/program/cycle";
import type { MuscleGroup, ProgramRecord } from "@/lib/program/types";
import { MUSCLE_LABELS } from "@/lib/program/types";
import {
  isExcludedFromPR,
  warmupPrescriptionFor,
  type WarmupPrescription,
} from "./prs";

export const SECONDARY_SET_WEIGHT = 0.5;
export const WEEKLY_WINDOW_DAYS = 7;

export const MUSCLE_ORDER: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "triceps",
  "biceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "forearms",
];

export function inTrailingWeek(date: string, today: string): boolean {
  if (date > today) return false;
  const gap = daysBetween(date, today);
  return gap >= 0 && gap < WEEKLY_WINDOW_DAYS;
}

export function trailingWeekStart(today: string): string {
  return addLocalDays(today, -(WEEKLY_WINDOW_DAYS - 1));
}

export interface MuscleVolume {
  muscle: MuscleGroup;
  label: string;
  sets: number;
}

export function creditSetToMuscles(
  totals: Partial<Record<MuscleGroup, number>>,
  primary: MuscleGroup[],
  secondary: MuscleGroup[] = [],
): void {
  for (const m of primary) {
    totals[m] = (totals[m] ?? 0) + 1;
  }
  for (const m of secondary) {
    totals[m] = (totals[m] ?? 0) + SECONDARY_SET_WEIGHT;
  }
}

export function inDateRange(
  date: string,
  start: string,
  end: string,
): boolean {
  return date >= start && date <= end;
}

export function isWorkingSet(
  set: HistorySet,
  warmup?: WarmupPrescription | null,
): boolean {
  if (isExcludedFromPR(set, warmup)) return false;
  return set.reps >= 1;
}

function muscleVolumeFromTotals(
  totals: Partial<Record<MuscleGroup, number>>,
): MuscleVolume[] {
  return MUSCLE_ORDER.filter((m) => (totals[m] ?? 0) > 0).map((muscle) => ({
    muscle,
    label: MUSCLE_LABELS[muscle],
    sets: totals[muscle] ?? 0,
  }));
}

/**
 * Weighted working-set counts per muscle in an inclusive date range.
 * Unknown exercise ids (removed from the program) contribute nothing.
 */
export function volumePerMuscleInRange(
  history: Record<string, HistoryEntry[]>,
  program: ProgramRecord,
  start: string,
  end: string,
): MuscleVolume[] {
  const totals: Partial<Record<MuscleGroup, number>> = {};

  for (const [exerciseId, entries] of Object.entries(history)) {
    const lib = program.exercises[exerciseId];
    if (!lib) continue;
    const warmup = warmupPrescriptionFor(program, exerciseId);
    for (const entry of entries) {
      if (!inDateRange(entry.date, start, end)) continue;
      for (const set of entry.sets) {
        if (!isWorkingSet(set, warmup)) continue;
        creditSetToMuscles(
          totals,
          lib.muscles.primary,
          lib.muscles.secondary ?? [],
        );
      }
    }
  }

  return muscleVolumeFromTotals(totals);
}

/**
 * Weighted working-set counts per muscle over the trailing 7 calendar days.
 */
export function weeklyVolumePerMuscle(
  history: Record<string, HistoryEntry[]>,
  program: ProgramRecord,
  today: string,
): MuscleVolume[] {
  return volumePerMuscleInRange(
    history,
    program,
    trailingWeekStart(today),
    today,
  );
}
