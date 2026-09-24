/**
 * History session-detail stats. Volume / RPE / PR-hit counts are derived
 * from exerciseHistory. Workout duration needs startedAt + finishedAt on
 * the sessions record (captured on Start / Finish).
 */

import type { SessionRecord } from "@/lib/db/cardio";
import type { HistoryEntry, HistorySet } from "@/lib/db/history";
import type { WeightUnit } from "@/lib/db/schema";
import { unitLabel } from "@/lib/program/format";
import type { DayKey, ProgramRecord } from "@/lib/program/types";
import {
  setEstablishesPR,
  setVolume,
  toPersonalRecord,
  warmupPrescriptionFor,
  type PersonalRecord,
} from "@/lib/progress/prs";
import { parseRpe } from "@/lib/progress/rpe";
import { isWorkingSet } from "@/lib/progress/volume";

export interface SessionExerciseSets {
  exerciseId: string;
  dayKey?: DayKey;
  sets: HistorySet[];
}

export function formatWorkoutDuration(
  startedAt: string,
  finishedAt: string,
): string | undefined {
  const start = Date.parse(startedAt);
  const end = Date.parse(finishedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return undefined;
  }
  const totalMin = Math.round((end - start) / 60_000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatVolumeDisplay(volumeKg: number, units: WeightUnit): string {
  const display = units === "kg" ? volumeKg : volumeKg * 2.2046226218;
  return `${Math.round(display)} ${unitLabel(units)}`;
}

export function formatAvgRpe(rpe: number): string {
  const rounded = Math.round(rpe * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function sessionWorkingVolumeKg(
  sets: HistorySet[],
  warmup?: Parameters<typeof isWorkingSet>[1],
): number {
  let total = 0;
  for (const set of sets) {
    if (!isWorkingSet(set, warmup)) continue;
    total += setVolume(set.weightKg, set.reps);
  }
  return total;
}

/** Mean of every set on this session that stored an RPE — including warm-ups. */
export function sessionStoredAvgRpe(sets: HistorySet[]): number | undefined {
  let sum = 0;
  let count = 0;
  for (const set of sets) {
    const rpe = parseRpe(set.rpe);
    if (rpe == null) continue;
    sum += rpe;
    count += 1;
  }
  if (count === 0) return undefined;
  return sum / count;
}

/**
 * Count sets on `date` that were an all-time best *at the moment they were
 * logged*. Replays each exercise chronologically and calls the live
 * `setEstablishesPR` comparator — never "does this match today's PR Wall".
 */
export function historicalPRHitsForDate(
  date: string,
  history: Record<string, HistoryEntry[]>,
  program: ProgramRecord,
): number {
  let hits = 0;
  for (const [exerciseId, entries] of Object.entries(history)) {
    const prType = program.exercises[exerciseId]?.prType ?? "weight";
    const chronological = [...entries].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    let best: PersonalRecord | null = null;
    for (const entry of chronological) {
      const warmup = warmupPrescriptionFor(program, exerciseId, entry.dayKey);
      const sets = [...entry.sets].sort((a, b) =>
        a.loggedAt.localeCompare(b.loggedAt),
      );
      for (const set of sets) {
        if (!setEstablishesPR(set, entry.date, best, prType, warmup)) continue;
        if (entry.date === date) hits += 1;
        best = toPersonalRecord(
          { weightKg: set.weightKg, reps: set.reps, date: entry.date },
          prType,
        );
      }
    }
  }
  return hits;
}

export interface SessionDetailStats {
  workoutDurationLabel?: string;
  totalVolumeKg?: number;
  avgRpe?: number;
  prHitCount?: number;
}

export function sessionDetailStats(
  date: string,
  exercises: SessionExerciseSets[],
  history: Record<string, HistoryEntry[]>,
  program: ProgramRecord,
  session?: SessionRecord,
): SessionDetailStats {
  let volumeKg = 0;
  let hasWorking = false;
  const allSets: HistorySet[] = [];
  for (const ex of exercises) {
    const warmup = warmupPrescriptionFor(program, ex.exerciseId, ex.dayKey);
    for (const set of ex.sets) {
      allSets.push(set);
      if (!isWorkingSet(set, warmup)) continue;
      hasWorking = true;
      volumeKg += setVolume(set.weightKg, set.reps);
    }
  }

  const stats: SessionDetailStats = {};
  if (session?.startedAt && session.finishedAt) {
    const label = formatWorkoutDuration(session.startedAt, session.finishedAt);
    if (label) stats.workoutDurationLabel = label;
  }
  if (hasWorking && volumeKg > 0) stats.totalVolumeKg = volumeKg;
  const avgRpe = sessionStoredAvgRpe(allSets);
  if (avgRpe != null) stats.avgRpe = avgRpe;
  const prHitCount = historicalPRHitsForDate(date, history, program);
  if (prHitCount > 0) stats.prHitCount = prHitCount;
  return stats;
}
