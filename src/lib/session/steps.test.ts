import { describe, expect, it } from "vitest";
import type { AssignedExercise } from "@/lib/db/program";
import type { DayAssignment, LibraryExercise } from "@/lib/program/types";
import { clampStep, sessionSteps } from "./steps";

const exercise = (id: string): LibraryExercise => ({
  id,
  name: id,
  muscles: { primary: ["chest"] },
  equipment: "barbell",
  cues: ["c"],
  mistakes: ["m"],
  icon: null,
  prType: "weight",
});

const assignment = (
  exerciseId: string,
  extra?: Partial<DayAssignment>,
): DayAssignment => ({
  exerciseId,
  sets: 3,
  reps: "10",
  weight: { kg: [20], lb: [44] },
  ...extra,
});

const row = (id: string, extra?: Partial<DayAssignment>): AssignedExercise => ({
  exercise: exercise(id),
  assignment: assignment(id, extra),
});

describe("sessionSteps", () => {
  it("lists lifts in assignment order and appends the day's cardio finisher last", () => {
    const lifts = [
      row("bench"),
      row("fly", {
        cardioFinisher: { activity: "Incline treadmill walk", durationMin: 15 },
      }),
    ];
    const assignments = lifts.map((l) => l.assignment);
    const steps = sessionSteps(lifts, assignments);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatchObject({ kind: "lift", row: { exercise: { id: "bench" } } });
    expect(steps[1]).toMatchObject({ kind: "lift", row: { exercise: { id: "fly" } } });
    expect(steps[2]).toEqual({
      kind: "cardio",
      activity: "Incline treadmill walk",
      durationMin: 15,
    });
  });

  it("omits cardio when the day has no finisher", () => {
    const lifts = [row("bench")];
    expect(sessionSteps(lifts, [assignment("bench")])).toHaveLength(1);
  });
});

describe("clampStep", () => {
  it("keeps resume index inside the step list", () => {
    expect(clampStep(0, 3)).toBe(0);
    expect(clampStep(2, 3)).toBe(2);
    expect(clampStep(9, 3)).toBe(2);
    expect(clampStep(-1, 3)).toBe(0);
    expect(clampStep(0, 0)).toBe(0);
  });
});
