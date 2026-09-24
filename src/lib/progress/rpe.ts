/**
 * RPE capture + fatigue trend. Optional integer 1–10 stored per set.
 * Trend is session-average RPE over time — not a 1RM chart.
 */

import type { HistoryEntry, HistorySet } from "@/lib/db/history";
import type { ProgramRecord } from "@/lib/program/types";
import { isWorkingSet } from "./volume";
import { warmupPrescriptionFor, type WarmupPrescription } from "./prs";

export function parseRpe(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 10) return undefined;
  return n;
}

export interface RpeTrendPoint {
  date: string;
  rpe: number;
  /** Working sets that day that actually had RPE. */
  setCount: number;
}

export function sessionAverageRpe(
  sets: HistorySet[],
  warmup?: WarmupPrescription | null,
): { rpe: number; setCount: number } | null {
  let sum = 0;
  let count = 0;
  for (const set of sets) {
    if (!isWorkingSet(set, warmup)) continue;
    const rpe = parseRpe(set.rpe);
    if (rpe == null) continue;
    sum += rpe;
    count += 1;
  }
  if (count === 0) return null;
  return { rpe: sum / count, setCount: count };
}

export function rpeTrendForExercise(
  entries: HistoryEntry[],
  warmup?: WarmupPrescription | null,
): RpeTrendPoint[] {
  const chronological = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const points: RpeTrendPoint[] = [];
  for (const entry of chronological) {
    const avg = sessionAverageRpe(entry.sets, warmup);
    if (!avg) continue;
    points.push({ date: entry.date, rpe: avg.rpe, setCount: avg.setCount });
  }
  return points;
}

export interface RpeTrendSeries {
  exerciseId: string;
  name: string;
  points: RpeTrendPoint[];
}

/** Exercises with at least one working set that has a stored RPE. */
export function rpeTrendSeries(
  history: Record<string, HistoryEntry[]>,
  program: ProgramRecord,
): RpeTrendSeries[] {
  const series: RpeTrendSeries[] = [];
  for (const [exerciseId, entries] of Object.entries(history)) {
    const lib = program.exercises[exerciseId];
    const warmup = warmupPrescriptionFor(program, exerciseId);
    const points = rpeTrendForExercise(entries, warmup);
    if (points.length === 0) continue;
    series.push({
      exerciseId,
      name: lib?.name ?? exerciseId,
      points,
    });
  }
  series.sort((a, b) => {
    const aLast = a.points[a.points.length - 1]?.date ?? "";
    const bLast = b.points[b.points.length - 1]?.date ?? "";
    return bLast.localeCompare(aLast) || a.name.localeCompare(b.name);
  });
  return series;
}

/** A line needs two dates. One RPE point is not a trend. */
export function canRenderRpeTrend(points: RpeTrendPoint[]): boolean {
  return points.length >= 2;
}
