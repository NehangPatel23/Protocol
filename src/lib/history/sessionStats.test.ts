import { describe, expect, it } from "vitest";
import type { HistoryEntry, HistorySet } from "@/lib/db/history";
import { buildProgramFromSeed } from "@/lib/program/seed";
import { bestPRFromHistory, warmupPrescriptionFor } from "@/lib/progress/prs";
import {
  formatAvgRpe,
  formatVolumeDisplay,
  formatWorkoutDuration,
  historicalPRHitsForDate,
  sessionDetailStats,
  sessionStoredAvgRpe,
  sessionWorkingVolumeKg,
} from "./sessionStats";

const program = buildProgramFromSeed();

function set(
  partial: Partial<HistorySet> & Pick<HistorySet, "weightKg" | "reps">,
): HistorySet {
  return {
    id: partial.id ?? "s",
    loggedAt: partial.loggedAt ?? "2026-09-01T18:00:00.000Z",
    weightKg: partial.weightKg,
    reps: partial.reps,
    isWarmup: partial.isWarmup,
    rpe: partial.rpe,
  };
}

function entry(
  date: string,
  sets: HistorySet[],
  dayKey?: HistoryEntry["dayKey"],
): HistoryEntry {
  return { date, dayKey, sets };
}

describe("formatWorkoutDuration", () => {
  it("formats 75 minutes as 1h 15m", () => {
    expect(
      formatWorkoutDuration(
        "2026-09-01T18:00:00.000Z",
        "2026-09-01T19:15:00.000Z",
      ),
    ).toBe("1h 15m");
  });

  it("omits zero minutes and zero hours", () => {
    expect(
      formatWorkoutDuration(
        "2026-09-01T18:00:00.000Z",
        "2026-09-01T19:00:00.000Z",
      ),
    ).toBe("1h");
    expect(
      formatWorkoutDuration(
        "2026-09-01T18:00:00.000Z",
        "2026-09-01T18:45:00.000Z",
      ),
    ).toBe("45m");
  });

  it("returns undefined when a timestamp is missing or inverted", () => {
    expect(formatWorkoutDuration("nope", "2026-09-01T19:00:00.000Z")).toBeUndefined();
    expect(
      formatWorkoutDuration(
        "2026-09-01T19:00:00.000Z",
        "2026-09-01T18:00:00.000Z",
      ),
    ).toBeUndefined();
  });
});

describe("session volume and RPE", () => {
  it("sums weight × reps on working sets and excludes the deadlift warmup", () => {
    const warmup = warmupPrescriptionFor(program, "deadlift");
    expect(
      sessionWorkingVolumeKg(
        [
          set({ weightKg: 20, reps: 10 }),
          set({ weightKg: 140, reps: 5 }),
          set({ weightKg: 200, reps: 3, isWarmup: true }),
        ],
        warmup,
      ),
    ).toBe(140 * 5);
  });

  it("averages every stored RPE, including a warmup, and omits when none exist", () => {
    expect(
      sessionStoredAvgRpe([
        set({ weightKg: 20, reps: 10, rpe: 5, isWarmup: true }),
        set({ weightKg: 40, reps: 8, rpe: 8 }),
        set({ weightKg: 40, reps: 8 }),
      ]),
    ).toBe(6.5);
    expect(sessionStoredAvgRpe([set({ weightKg: 40, reps: 8 })])).toBeUndefined();
    expect(formatAvgRpe(6.5)).toBe("6.5");
    expect(formatAvgRpe(8)).toBe("8");
  });

  it("formats volume in the display unit without gym-plate rounding", () => {
    expect(formatVolumeDisplay(360, "kg")).toBe("360 kg");
    expect(formatVolumeDisplay(360, "lb")).toBe("794 lb");
  });
});

describe("historicalPRHitsForDate", () => {
  it("counts a set that was the all-time best when logged, even after a later session beat it", () => {
    const history = {
      "chest-press-machine": [
        entry("2026-09-08", [set({ weightKg: 20, reps: 10, loggedAt: "2026-09-08T18:00:00.000Z" })], "push"),
        entry("2026-09-15", [set({ weightKg: 30, reps: 10, loggedAt: "2026-09-15T18:00:00.000Z" })], "push"),
      ],
    };
    expect(historicalPRHitsForDate("2026-09-08", history, program)).toBe(1);
    expect(historicalPRHitsForDate("2026-09-15", history, program)).toBe(1);
    const wall = bestPRFromHistory(history["chest-press-machine"]!, "weight");
    expect(wall?.weightKg).toBe(30);
    expect(wall?.date).toBe("2026-09-15");
  });

  it("does not count a later session that only matches today's wall", () => {
    const history = {
      "chest-press-machine": [
        entry("2026-09-08", [set({ weightKg: 20, reps: 10 })], "push"),
        entry("2026-09-15", [set({ weightKg: 20, reps: 10 })], "push"),
      ],
    };
    expect(historicalPRHitsForDate("2026-09-08", history, program)).toBe(1);
    expect(historicalPRHitsForDate("2026-09-15", history, program)).toBe(0);
  });

  it("uses inverse-weight branching so less assist is a hit and the earlier heavier-assist day still counts", () => {
    const history = {
      "weighted-assisted-pullups": [
        entry("2026-09-01", [set({ weightKg: 31.25, reps: 12 })], "pull"),
        entry("2026-09-06", [set({ weightKg: 26, reps: 12 })], "pull"),
      ],
    };
    expect(historicalPRHitsForDate("2026-09-01", history, program)).toBe(1);
    expect(historicalPRHitsForDate("2026-09-06", history, program)).toBe(1);
    expect(
      bestPRFromHistory(history["weighted-assisted-pullups"]!, "inverse-weight")
        ?.weightKg,
    ).toBe(26);
  });

  it("uses reps branching so a later lower-rep day is not a hit", () => {
    const history = {
      "push-ups": [
        entry("2026-09-01", [set({ weightKg: 0, reps: 14 })], "push"),
        entry("2026-09-06", [set({ weightKg: 0, reps: 10 })], "push"),
      ],
    };
    expect(historicalPRHitsForDate("2026-09-01", history, program)).toBe(1);
    expect(historicalPRHitsForDate("2026-09-06", history, program)).toBe(0);
  });

  it("excludes warm-ups and still treats a higher Epley ≤12-rep set as a hit", () => {
    const history = {
      deadlift: [
        entry(
          "2026-09-06",
          [
            set({ weightKg: 20, reps: 10, loggedAt: "2026-09-06T18:00:00.000Z" }),
            set({
              weightKg: 100,
              reps: 1,
              loggedAt: "2026-09-06T18:05:00.000Z",
            }),
          ],
          "legs",
        ),
        entry(
          "2026-09-13",
          [set({ weightKg: 80, reps: 8, loggedAt: "2026-09-13T18:00:00.000Z" })],
          "legs",
        ),
      ],
    };
    expect(historicalPRHitsForDate("2026-09-06", history, program)).toBe(1);
    expect(historicalPRHitsForDate("2026-09-13", history, program)).toBe(1);
  });
});

describe("sessionDetailStats", () => {
  it("omits duration without timestamps, RPE without values, and PRs when none were hit", () => {
    const date = "2026-09-15";
    const laterSets = [set({ weightKg: 20, reps: 10 })];
    const history = {
      "chest-press-machine": [
        entry("2026-09-08", [set({ weightKg: 20, reps: 10 })], "push"),
        entry(date, laterSets, "push"),
      ],
    };
    const later = sessionDetailStats(
      date,
      [
        {
          exerciseId: "chest-press-machine",
          dayKey: "push",
          sets: laterSets,
        },
      ],
      history,
      program,
      {
        date,
        dayKey: "push",
        type: "program",
        entries: [],
        cardio: null,
        complete: true,
      },
    );
    expect(later.workoutDurationLabel).toBeUndefined();
    expect(later.avgRpe).toBeUndefined();
    expect(later.prHitCount).toBeUndefined();
    expect(later.totalVolumeKg).toBe(20 * 10);
  });

  it("populates all four fields when timestamps, working volume, RPE, and a log-time PR exist", () => {
    const date = "2026-09-08";
    const sets = [
      set({
        weightKg: 20,
        reps: 10,
        rpe: 7,
        loggedAt: "2026-09-08T18:10:00.000Z",
      }),
    ];
    const stats = sessionDetailStats(
      date,
      [{ exerciseId: "chest-press-machine", dayKey: "push", sets }],
      { "chest-press-machine": [entry(date, sets, "push")] },
      program,
      {
        date,
        dayKey: "push",
        type: "program",
        entries: [],
        cardio: null,
        complete: true,
        startedAt: "2026-09-08T18:00:00.000Z",
        finishedAt: "2026-09-08T19:15:00.000Z",
      },
    );
    expect(stats.workoutDurationLabel).toBe("1h 15m");
    expect(stats.totalVolumeKg).toBe(200);
    expect(stats.avgRpe).toBe(7);
    expect(stats.prHitCount).toBe(1);
  });
});
