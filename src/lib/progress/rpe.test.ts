import { describe, expect, it } from "vitest";
import type { HistoryEntry } from "@/lib/db/history";
import { buildProgramFromSeed } from "@/lib/program/seed";
import {
  canRenderRpeTrend,
  parseRpe,
  rpeTrendForExercise,
  rpeTrendSeries,
} from "./rpe";

const program = buildProgramFromSeed();

function entry(
  date: string,
  sets: Array<{ weightKg: number; reps: number; rpe?: number; isWarmup?: boolean }>,
): HistoryEntry {
  return {
    date,
    sets: sets.map((s, i) => ({
      id: `${date}-${i}`,
      weightKg: s.weightKg,
      reps: s.reps,
      rpe: s.rpe,
      isWarmup: s.isWarmup,
      loggedAt: `${date}T18:0${i}:00.000Z`,
    })),
  };
}

describe("parseRpe", () => {
  it("accepts integers 1–10 and rejects everything else", () => {
    expect(parseRpe(1)).toBe(1);
    expect(parseRpe(10)).toBe(10);
    expect(parseRpe("8")).toBe(8);
    expect(parseRpe(0)).toBeUndefined();
    expect(parseRpe(11)).toBeUndefined();
    expect(parseRpe(8.5)).toBeUndefined();
    expect(parseRpe(undefined)).toBeUndefined();
    expect(parseRpe("")).toBeUndefined();
  });
});

describe("rpeTrendForExercise", () => {
  it("averages working-set RPE per session and ignores warmups and missing RPE", () => {
    const points = rpeTrendForExercise([
      entry("2026-09-01", [
        { weightKg: 20, reps: 10, rpe: 7 },
        { weightKg: 20, reps: 10, rpe: 9 },
      ]),
      entry("2026-09-03", [{ weightKg: 20, reps: 10, isWarmup: true, rpe: 5 }]),
      entry("2026-09-05", [{ weightKg: 22, reps: 10 }]),
      entry("2026-09-06", [{ weightKg: 22, reps: 10, rpe: 8 }]),
    ]);
    expect(points).toEqual([
      { date: "2026-09-01", rpe: 8, setCount: 2 },
      { date: "2026-09-06", rpe: 8, setCount: 1 },
    ]);
    expect(canRenderRpeTrend(points)).toBe(true);
  });

  it("does not render a trend from a single session", () => {
    const points = rpeTrendForExercise([
      entry("2026-09-06", [{ weightKg: 20, reps: 10, rpe: 7 }]),
    ]);
    expect(canRenderRpeTrend(points)).toBe(false);
  });

  it("lists only exercises that actually stored RPE", () => {
    const history: Record<string, HistoryEntry[]> = {
      "chest-press-machine": [
        entry("2026-09-06", [{ weightKg: 20, reps: 12 }]),
      ],
      "row-cable": [
        entry("2026-09-05", [{ weightKg: 25, reps: 12, rpe: 8 }]),
      ],
    };
    const series = rpeTrendSeries(history, program);
    expect(series).toHaveLength(1);
    expect(series[0].exerciseId).toBe("row-cable");
  });
});
