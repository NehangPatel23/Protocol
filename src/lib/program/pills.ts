import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bandage,
  CircleDot,
  Dumbbell,
  RefreshCw,
  Repeat,
} from "lucide-react";
import type { LibraryExercise, MuscleGroup } from "./types";

export type PillTone = "muted" | "accent";

export interface ExercisePill {
  id: string;
  label: string;
  tone: PillTone;
  icon: LucideIcon;
}

/** Arm isolations often list a related secondary group; still isolation. */
const ISOLATION_PAIRS: ReadonlyArray<readonly [MuscleGroup, MuscleGroup]> = [
  ["biceps", "forearms"],
  ["forearms", "biceps"],
];

export function isCompoundMovement(exercise: LibraryExercise): boolean {
  if (exercise.difficultyTags?.includes("compound")) return true;
  const primary = exercise.muscles.primary;
  const secondary = exercise.muscles.secondary ?? [];
  if (primary.length >= 2) return true;
  if (secondary.length >= 2) return true;
  if (primary.length === 1 && secondary.length === 1) {
    return !ISOLATION_PAIRS.some(
      ([a, b]) => primary[0] === a && secondary[0] === b,
    );
  }
  return false;
}

function sourceText(exercise: LibraryExercise, extra: string[]): string {
  return [
    ...exercise.cues,
    ...exercise.mistakes,
    exercise.note ?? "",
    exercise.alternativeNote ?? "",
    ...(exercise.setup ?? []),
    ...extra,
  ]
    .join(" ")
    .toLowerCase();
}

function watchPills(blob: string): ExercisePill[] {
  const pills: ExercisePill[] = [];
  if (
    /valg|knees? cav|collaps\w* inward|past (?:your |the )?toes/.test(blob)
  ) {
    pills.push({
      id: "watch-knees",
      label: "Watch Knees",
      tone: "muted",
      icon: Bandage,
    });
  }
  if (
    /round(?:ing)? the (?:lower )?back|lower[- ]back|spinal|back rounds|over-?arch(?:ing)? the lower back|lower back (?:lift|feel|arch)/.test(
      blob,
    )
  ) {
    pills.push({
      id: "watch-back",
      label: "Watch Back",
      tone: "muted",
      icon: Bandage,
    });
  }
  if (/flaring wrists|wrists? (?:or shoulders )?bother/.test(blob)) {
    pills.push({
      id: "watch-wrists",
      label: "Watch Wrists",
      tone: "muted",
      icon: Bandage,
    });
  }
  if (/elbow strain/.test(blob)) {
    pills.push({
      id: "watch-elbows",
      label: "Watch Elbows",
      tone: "muted",
      icon: Bandage,
    });
  }
  if (/shoulders bother/.test(blob)) {
    pills.push({
      id: "watch-shoulders",
      label: "Watch Shoulders",
      tone: "muted",
      icon: Bandage,
    });
  }
  return pills;
}

/**
 * Difficulty / injury flags from the seed, plus Compound vs Isolation from
 * muscle groups. Watch pills only fire on joint/injury language already in
 * cues, mistakes, or notes — nothing is invented.
 */
export function pillsForExercise(
  exercise: LibraryExercise,
  extraText: string[] = [],
): ExercisePill[] {
  const tags = exercise.difficultyTags ?? [];
  const pills: ExercisePill[] = [];

  if (tags.includes("high-difficulty")) {
    pills.push({
      id: "high-difficulty",
      label: "High Difficulty",
      tone: "muted",
      icon: AlertTriangle,
    });
  }

  pills.push(...watchPills(sourceText(exercise, extraText)));

  if (isCompoundMovement(exercise)) {
    pills.push({
      id: "compound",
      label: "Compound",
      tone: "accent",
      icon: Dumbbell,
    });
  } else {
    pills.push({
      id: "isolation",
      label: "Isolation",
      tone: "accent",
      icon: CircleDot,
    });
  }

  if (tags.includes("form-refresher-priority")) {
    pills.push({
      id: "form-refresher-priority",
      label: "Form Refresher",
      tone: "muted",
      icon: RefreshCw,
    });
  }

  if (tags.includes("replaces-barbell-press")) {
    pills.push({
      id: "replaces-barbell-press",
      label: "Replaces Barbell Press",
      tone: "muted",
      icon: Repeat,
    });
  }

  return pills;
}
