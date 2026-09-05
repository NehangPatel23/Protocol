import type { AssignedExercise } from "@/lib/db/program";
import type { DayAssignment } from "@/lib/program/types";

export type SessionStep =
  | { kind: "lift"; index: number; row: AssignedExercise }
  | { kind: "cardio"; activity: string; durationMin: number };

export function cardioFinisherFromAssignments(
  assignments: DayAssignment[],
): { activity: string; durationMin: number } | null {
  const found = assignments
    .map((a) => a.cardioFinisher)
    .find((f): f is NonNullable<typeof f> => Boolean(f));
  return found ?? null;
}

/** Today's programmed lifts in order, then the day's cardio finisher if any. */
export function sessionSteps(
  lifts: AssignedExercise[],
  assignments: DayAssignment[],
): SessionStep[] {
  const steps: SessionStep[] = lifts.map((row, index) => ({
    kind: "lift",
    index,
    row,
  }));
  const finisher = cardioFinisherFromAssignments(assignments);
  if (finisher) {
    steps.push({
      kind: "cardio",
      activity: finisher.activity,
      durationMin: finisher.durationMin,
    });
  }
  return steps;
}

export function clampStep(step: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(0, step), length - 1);
}
