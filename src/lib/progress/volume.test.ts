import { describe, expect, it } from "vitest";
import { buildProgramFromSeed } from "@/lib/program/seed";
import type { HistoryEntry } from "@/lib/db/history";
import {
  creditSetToMuscles,
  inTrailingWeek,
  SECONDARY_SET_WEIGHT,
  trailingWeekStart,
  weeklyVolumePerMuscle,
} from "./volume";
import type { MuscleGroup } from "@/lib/program/types";

const program = buildProgramFromSeed();
const today = "2026-09-06";

function historyFor(
  exerciseId: string,
  date: string,
  sets: Array<{ weightKg: number; reps: number; isWarmup?: boolean }>,
): Record<string, HistoryEntry[]> {
  return {
    [exerciseId]: [
      {
        date,
        sets: sets.map((s, i) => ({
          id: `${exerciseId}-${i}`,
          weightKg: s.weightKg,
          reps: s.reps,
          isWarmup: s.isWarmup,
          loggedAt: `${date}T18:0${i}:00.000Z`,
        })),
      },
    ],
  };
}

describe("trailing 7-day window", () => {
  it("is today plus the 6 prior calendar days — not a Monday–Sunday week", () => {
    expect(trailingWeekStart(today)).toBe("2026-08-31");
    expect(inTrailingWeek("2026-09-06", today)).toBe(true);
    expect(inTrailingWeek("2026-08-31", today)).toBe(true);
    expect(inTrailingWeek("2026-08-30", today)).toBe(false);
    expect(inTrailingWeek("2026-09-07", today)).toBe(false);
  });
});

describe("primary / secondary weighting", () => {
  it("credits primary muscles 1.0 and secondary 0.5 per working set", () => {
    const totals: Partial<Record<MuscleGroup, number>> = {};
    creditSetToMuscles(totals, ["back"], ["biceps"]);
    expect(totals.back).toBe(1);
    expect(totals.biceps).toBe(SECONDARY_SET_WEIGHT);
    creditSetToMuscles(totals, ["back"], ["biceps"]);
    expect(totals.back).toBe(2);
    expect(totals.biceps).toBe(1);
  });

  it("gives every listed primary full credit (deadlift: back + glutes + hamstrings)", () => {
    const totals: Partial<Record<MuscleGroup, number>> = {};
    creditSetToMuscles(
      totals,
      ["back", "glutes", "hamstrings"],
      ["core", "forearms"],
    );
    expect(totals.back).toBe(1);
    expect(totals.glutes).toBe(1);
    expect(totals.hamstrings).toBe(1);
    expect(totals.core).toBe(0.5);
    expect(totals.forearms).toBe(0.5);
  });
});

describe("weeklyVolumePerMuscle", () => {
  it("uses row-cable seed muscles: back full, biceps half, and ignores a warmup", () => {
    const history = {
      "row-cable": [
        {
          date: today,
          sets: [
            {
              id: "wu",
              weightKg: 10,
              reps: 15,
              isWarmup: true,
              loggedAt: `${today}T17:00:00.000Z`,
            },
            {
              id: "a",
              weightKg: 25,
              reps: 15,
              loggedAt: `${today}T18:00:00.000Z`,
            },
            {
              id: "b",
              weightKg: 25,
              reps: 15,
              loggedAt: `${today}T18:05:00.000Z`,
            },
          ],
        },
      ],
    };
    const rows = weeklyVolumePerMuscle(history, program, today);
    expect(rows.find((r) => r.muscle === "back")?.sets).toBe(2);
    expect(rows.find((r) => r.muscle === "biceps")?.sets).toBe(1);
    expect(rows.find((r) => r.muscle === "chest")).toBeUndefined();
  });

  it("excludes the deadlift 20 kg × 10 warmup pattern from volume", () => {
    const history = historyFor("deadlift", today, [
      { weightKg: 20, reps: 10 },
      { weightKg: 50, reps: 3 },
    ]);
    const rows = weeklyVolumePerMuscle(history, program, today);
    // one working set → back/glutes/hamstrings 1, core/forearms 0.5
    expect(rows.find((r) => r.muscle === "back")?.sets).toBe(1);
    expect(rows.find((r) => r.muscle === "glutes")?.sets).toBe(1);
    expect(rows.find((r) => r.muscle === "core")?.sets).toBe(0.5);
  });

  it("drops sets outside the trailing week", () => {
    const inside = historyFor("row-cable", "2026-08-31", [
      { weightKg: 25, reps: 15 },
    ]);
    const outside = historyFor("row-cable", "2026-08-30", [
      { weightKg: 25, reps: 15 },
    ]);
    expect(
      weeklyVolumePerMuscle(inside, program, today).find((r) => r.muscle === "back")
        ?.sets,
    ).toBe(1);
    expect(weeklyVolumePerMuscle(outside, program, today)).toEqual([]);
  });

  it("returns an empty list when nothing was logged — not a fake zero-filled chart", () => {
    expect(weeklyVolumePerMuscle({}, program, today)).toEqual([]);
  });
});
