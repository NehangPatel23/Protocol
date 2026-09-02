/**
 * Decoupled program model — Master Prompt §2.2a.
 * Seed file (docs/program-data.ts) is flat (day lives on the exercise).
 * The live schema splits a day-agnostic library from per-day assignments.
 */

export type {
  DayKey,
  MuscleGroup,
  PRType,
  WeightRange,
} from "../../../docs/program-data";

export {
  DAYS,
  MUSCLE_LABELS,
} from "../../../docs/program-data";

import type {
  DayKey,
  MuscleGroup,
  PRType,
  WeightRange,
} from "../../../docs/program-data";

/** Day-agnostic exercise library entry. Prescription lives on assignments. */
export interface LibraryExercise {
  id: string;
  name: string;
  muscles: { primary: MuscleGroup[]; secondary?: MuscleGroup[] };
  equipment: string;
  setup?: string[];
  cues: string[];
  mistakes: string[];
  alternativeId?: string;
  alternativeNote?: string;
  note?: string;
  difficultyTags?: string[];
  icon: string | null;
  prType: PRType;
}

/**
 * One programmed slot on a day. Same exerciseId can appear on multiple days
 * with different sets/reps/weight (e.g. Push working sets vs Upper follow-up).
 */
export interface DayAssignment {
  exerciseId: string;
  sets: number | string;
  reps: string;
  weight: WeightRange | "bodyweight";
  warmup?: { sets: number; reps: string; weight: WeightRange };
  /** True when this row is itself a warm-up (none in the seed; nested `warmup` is used). */
  isWarmup?: boolean;
  isSecondSession?: boolean;
  cardioFinisher?: { activity: string; durationMin: number };
  /** Follow-up-day technique notes; library keeps the primary-session copy. */
  sessionCues?: string[];
  sessionMistakes?: string[];
  sessionNote?: string;
  alternativeId?: string;
  alternativeNote?: string;
}

export interface ProgramRecord {
  exercises: Record<string, LibraryExercise>;
  assignments: Record<DayKey, DayAssignment[]>;
  /** 7-day cycle including both Rest slots (same dayKey twice). */
  cycleOrder: DayKey[];
}

export const PROGRAM_STORE_KEYS = {
  exercises: "exercises",
  assignments: "assignments",
  cycleOrder: "cycleOrder",
} as const;
