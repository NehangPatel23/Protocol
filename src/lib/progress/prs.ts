/**
 * PR detection — Master Prompt §6.4, program-data.ts `prType`.
 * Pure. The `prs` store is a write-through snapshot of this projection.
 */

import type { HistoryEntry, HistorySet } from "@/lib/db/history";
import { epley1RM, parseRepsFor1RM } from "@/lib/program/format";
import { isDayKey } from "@/lib/program/days";
import type { PRType, ProgramRecord, WeightRange } from "@/lib/program/types";

export interface PersonalRecord {
  weightKg: number;
  reps: number;
  /** Epley (or observed 1-rep). Null for >12-rep work, reps, and inverse-weight. */
  est1RM: number | null;
  date: string;
}

export interface PRCandidate {
  weightKg: number;
  reps: number;
  date: string;
}

export type WarmupPrescription = {
  sets: number;
  reps: string;
  weight: WeightRange;
};

const WEIGHT_EPS = 0.05;
/** kg/lb round-trip on the deadlift 20 kg / 44 lb warmup. */
const WARMUP_WEIGHT_EPS = 0.3;

export function weightsEqualKg(a: number, b: number, eps = WEIGHT_EPS): boolean {
  return Math.abs(a - b) < eps;
}

export function setVolume(weightKg: number, reps: number): number {
  return weightKg * reps;
}

export function matchesWarmupPattern(
  set: Pick<HistorySet, "weightKg" | "reps">,
  warmup?: WarmupPrescription | null,
): boolean {
  if (!warmup) return false;
  const reps = parseRepsFor1RM(warmup.reps);
  if (reps == null || set.reps !== reps) return false;
  return warmup.weight.kg.some((kg) =>
    weightsEqualKg(set.weightKg, kg, WARMUP_WEIGHT_EPS),
  );
}

/** Explicit flag or programmed warmup pattern (deadlift 3×10 @ 20 kg). */
export function isExcludedFromPR(
  set: HistorySet,
  warmup?: WarmupPrescription | null,
): boolean {
  if (set.isWarmup === true) return true;
  return matchesWarmupPattern(set, warmup);
}

export function warmupPrescriptionFor(
  program: ProgramRecord,
  exerciseId: string,
  dayKey?: string,
): WarmupPrescription | undefined {
  if (dayKey && isDayKey(dayKey)) {
    const row = program.assignments[dayKey]?.find(
      (a) => a.exerciseId === exerciseId,
    );
    if (row?.warmup) return row.warmup;
  }
  for (const rows of Object.values(program.assignments)) {
    const found = rows.find((a) => a.exerciseId === exerciseId && a.warmup);
    if (found?.warmup) return found.warmup;
  }
  return undefined;
}

export function assignmentIsWarmupRow(
  program: ProgramRecord,
  exerciseId: string,
  dayKey?: string,
): boolean {
  if (!dayKey || !isDayKey(dayKey)) return false;
  const row = program.assignments[dayKey]?.find(
    (a) => a.exerciseId === exerciseId,
  );
  return row?.isWarmup === true;
}

export function toPersonalRecord(
  candidate: PRCandidate,
  prType: PRType,
): PersonalRecord {
  return {
    weightKg: candidate.weightKg,
    reps: candidate.reps,
    est1RM: prType === "weight" ? epley1RM(candidate.weightKg, candidate.reps) : null,
    date: candidate.date,
  };
}

/**
 * Does `next` beat `current` for this prType?
 *
 * - weight: higher load, or higher Epley 1RM when both sets are ≤12 reps.
 *   Sets above 12 compare by top-set volume (weight × reps), never a fake 1RM.
 * - reps: most completed reps.
 * - inverse-weight: less assist at the same or more reps (or same assist, more reps).
 */
export function beats(
  next: PRCandidate,
  current: PersonalRecord,
  prType: PRType,
): boolean {
  if (prType === "reps") {
    return next.reps > current.reps;
  }
  if (prType === "inverse-weight") {
    const lessAssist = next.weightKg < current.weightKg - WEIGHT_EPS;
    const sameAssist = weightsEqualKg(next.weightKg, current.weightKg);
    if (lessAssist && next.reps >= current.reps) return true;
    if (sameAssist && next.reps > current.reps) return true;
    return false;
  }
  // 'weight'
  if (next.weightKg > current.weightKg + WEIGHT_EPS) return true;
  const next1RM = epley1RM(next.weightKg, next.reps);
  const current1RM =
    current.est1RM ?? epley1RM(current.weightKg, current.reps);
  if (next1RM != null && current1RM != null && next1RM > current1RM) return true;
  if (next.reps > 12 && current.reps > 12) {
    return (
      setVolume(next.weightKg, next.reps) >
      setVolume(current.weightKg, current.reps)
    );
  }
  return false;
}

export function bestPRFromHistory(
  entries: HistoryEntry[],
  prType: PRType,
  warmup?: WarmupPrescription | null,
): PersonalRecord | null {
  let best: PersonalRecord | null = null;
  const chronological = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  for (const entry of chronological) {
    const sets = [...entry.sets].sort((a, b) =>
      a.loggedAt.localeCompare(b.loggedAt),
    );
    for (const set of sets) {
      if (isExcludedFromPR(set, warmup)) continue;
      if (!(set.reps >= 1)) continue;
      const candidate: PRCandidate = {
        weightKg: set.weightKg,
        reps: set.reps,
        date: entry.date,
      };
      if (!best || beats(candidate, best, prType)) {
        best = toPersonalRecord(candidate, prType);
      }
    }
  }
  return best;
}

/** Whether this newly logged set itself is a PR (for the celebration toast). */
export function setEstablishesPR(
  set: HistorySet,
  date: string,
  previousBest: PersonalRecord | null,
  prType: PRType,
  warmup?: WarmupPrescription | null,
): boolean {
  if (isExcludedFromPR(set, warmup)) return false;
  if (!(set.reps >= 1)) return false;
  if (!previousBest) return true;
  return beats({ weightKg: set.weightKg, reps: set.reps, date }, previousBest, prType);
}

export function shouldFlagWarmup(
  input: { weightKg: number; reps: number; isWarmup?: boolean },
  program: ProgramRecord,
  exerciseId: string,
  dayKey?: string,
): boolean {
  if (input.isWarmup === true) return true;
  if (assignmentIsWarmupRow(program, exerciseId, dayKey)) return true;
  const warmup = warmupPrescriptionFor(program, exerciseId, dayKey);
  return matchesWarmupPattern(input, warmup);
}
