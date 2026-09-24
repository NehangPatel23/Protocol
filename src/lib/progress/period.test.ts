import { describe, expect, it } from "vitest";
import type { HistoryEntry } from "@/lib/db/history";
import { buildProgramFromSeed } from "@/lib/program/seed";
import {
  compareExerciseVolume,
  compareMuscleVolume,
  formatPeriodDelta,
  hasEnoughPeriodHistory,
  percentChange,
  periodWindows,
} from "./period";

const program = buildProgramFromSeed();
const today = "2026-09-06";

function set(
  date: string,
  extra: Partial<HistoryEntry["sets"][number]> = {},
): HistoryEntry {
  return {
    date,
    sets: [
      {
        id: `${date}-s`,
        weightKg: 25,
        reps: 12,
        loggedAt: `${date}T18:00:00.000Z`,
        ...extra,
      },
    ],
  };
}

describe("period windows", () => {
  it("is two adjacent 28-day ranges, not calendar months", () => {
    const windows = periodWindows(today);
    expect(windows.recent).toEqual({ start: "2026-08-10", end: "2026-09-06" });
    expect(windows.previous).toEqual({ start: "2026-07-13", end: "2026-08-09" });
  });
});

describe("hasEnoughPeriodHistory", () => {
  it("is false when the previous 4 weeks have no working sets", () => {
    const history = {
      "row-cable": [set("2026-09-01")],
    };
    expect(hasEnoughPeriodHistory(history, program, today)).toBe(false);
  });

  it("is false when only the previous window has data", () => {
    const history = {
      "row-cable": [set("2026-07-20")],
    };
    expect(hasEnoughPeriodHistory(history, program, today)).toBe(false);
  });

  it("is false when the previous window is warmup-only", () => {
    const history = {
      deadlift: [
        set("2026-07-20", { weightKg: 20, reps: 10 }),
        set("2026-09-01", { weightKg: 140, reps: 5 }),
      ],
    };
    expect(hasEnoughPeriodHistory(history, program, today)).toBe(false);
  });

  it("is true only when both windows have a working set", () => {
    const history = {
      "row-cable": [set("2026-07-20"), set("2026-09-01")],
    };
    expect(hasEnoughPeriodHistory(history, program, today)).toBe(true);
  });
});

describe("compareMuscleVolume", () => {
  it("reuses primary 1.0 / secondary 0.5 weighting across both windows", () => {
    const history: Record<string, HistoryEntry[]> = {
      "row-cable": [
        set("2026-07-20"),
        set("2026-07-21"),
        set("2026-09-01"),
      ],
    };
    const rows = compareMuscleVolume(history, program, today);
    const back = rows.find((r) => r.muscle === "back");
    const biceps = rows.find((r) => r.muscle === "biceps");
    expect(back).toEqual({
      muscle: "back",
      label: "Back",
      recentSets: 1,
      previousSets: 2,
    });
    expect(biceps).toEqual({
      muscle: "biceps",
      label: "Biceps",
      recentSets: 0.5,
      previousSets: 1,
    });
  });
});

describe("compareExerciseVolume", () => {
  it("counts working sets per lift and ignores unknown ids", () => {
    const history: Record<string, HistoryEntry[]> = {
      "row-cable": [set("2026-07-20"), set("2026-09-01"), set("2026-09-02")],
      ghost: [set("2026-07-20"), set("2026-09-01")],
    };
    const rows = compareExerciseVolume(history, program, today);
    expect(rows).toHaveLength(1);
    expect(rows[0].exerciseId).toBe("row-cable");
    expect(rows[0].previousSets).toBe(1);
    expect(rows[0].recentSets).toBe(2);
    expect(rows[0].recentBest?.weightKg).toBe(25);
  });
});

describe("formatPeriodDelta", () => {
  it("never reports +Infinity when the previous window is empty for one row", () => {
    expect(percentChange(4, 0)).toBeNull();
    expect(formatPeriodDelta(4, 0)).toBe("new");
    expect(formatPeriodDelta(0, 4)).toBe("none this period");
    expect(formatPeriodDelta(6, 4)).toBe("+50%");
    expect(formatPeriodDelta(3, 4)).toBe("-25%");
    expect(formatPeriodDelta(4, 4)).toBe("0%");
  });
});
