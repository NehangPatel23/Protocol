import { describe, expect, it } from "vitest";
import type { HistoryEntry } from "@/lib/db/history";
import { buildProgramFromSeed } from "@/lib/program/seed";
import { detectPlateaus, isPauseWindowActive } from "./plateau";

const program = buildProgramFromSeed();
const today = "2026-09-06";

function sessions(
  dates: string[],
  load: { weightKg: number; reps: number; isWarmup?: boolean },
): HistoryEntry[] {
  return dates.map((date, i) => ({
    date,
    sets: [
      {
        id: `${date}-${i}`,
        weightKg: load.weightKg,
        reps: load.reps,
        isWarmup: load.isWarmup,
        loggedAt: `${date}T18:00:00.000Z`,
      },
    ],
  }));
}

describe("isPauseWindowActive", () => {
  it("is inactive unless pauseMode.active and today is on or before until", () => {
    expect(
      isPauseWindowActive({ active: false, until: "2026-09-20" }, today),
    ).toBe(false);
    expect(isPauseWindowActive({ active: true, until: null }, today)).toBe(
      true,
    );
    expect(
      isPauseWindowActive({ active: true, until: "2026-09-06" }, today),
    ).toBe(true);
    expect(
      isPauseWindowActive({ active: true, until: "2026-09-01" }, today),
    ).toBe(false);
  });
});

describe("detectPlateaus", () => {
  it("flags four consecutive sessions at the same weight and reps", () => {
    const history = {
      "chest-press-machine": sessions(
        ["2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"],
        { weightKg: 20, reps: 12 },
      ),
    };
    const flags = detectPlateaus(history, program, today);
    expect(flags).toHaveLength(1);
    expect(flags[0].exerciseId).toBe("chest-press-machine");
    expect(flags[0].sessionDates).toHaveLength(4);
  });

  it("does not flag an exercise that added weight on the fourth session", () => {
    const dates = ["2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"];
    const history = {
      "chest-press-machine": dates.map((date, i) => ({
        date,
        sets: [
          {
            id: `${date}`,
            weightKg: i === 3 ? 22.5 : 20,
            reps: 12,
            loggedAt: `${date}T18:00:00.000Z`,
          },
        ],
      })),
    };
    expect(detectPlateaus(history, program, today)).toEqual([]);
  });

  it("does not flag three stalled sessions — needs four", () => {
    const history = {
      "chest-press-machine": sessions(
        ["2026-08-17", "2026-08-24", "2026-08-31"],
        { weightKg: 20, reps: 12 },
      ),
    };
    expect(detectPlateaus(history, program, today)).toEqual([]);
  });

  it("ignores warmup-only days so they cannot pad a plateau", () => {
    const history = {
      deadlift: [
        ...sessions(
          ["2026-08-10", "2026-08-17", "2026-08-24"],
          { weightKg: 140, reps: 5 },
        ),
        {
          date: "2026-08-31",
          sets: [
            {
              id: "wu",
              weightKg: 20,
              reps: 10,
              loggedAt: "2026-08-31T18:00:00.000Z",
            },
          ],
        },
      ],
    };
    expect(detectPlateaus(history, program, today)).toEqual([]);
  });

  it("suppresses every flag while pause mode is in window", () => {
    const history = {
      "chest-press-machine": sessions(
        ["2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"],
        { weightKg: 20, reps: 12 },
      ),
    };
    expect(
      detectPlateaus(history, program, today, {
        active: true,
        until: "2026-09-20",
      }),
    ).toEqual([]);
  });

  it("treats more reps at the same load as progress for weight lifts", () => {
    const dates = ["2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"];
    const history = {
      "chest-press-machine": dates.map((date, i) => ({
        date,
        sets: [
          {
            id: date,
            weightKg: 20,
            reps: i === 3 ? 15 : 12,
            loggedAt: `${date}T18:00:00.000Z`,
          },
        ],
      })),
    };
    expect(detectPlateaus(history, program, today)).toEqual([]);
  });
});
