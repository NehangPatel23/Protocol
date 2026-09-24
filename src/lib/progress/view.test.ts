import { describe, expect, it } from "vitest";
import { buildProgramFromSeed } from "@/lib/program/seed";
import type { HistoryEntry } from "@/lib/db/history";
import {
  buildPRWall,
  formatPRCaption,
  formatPRHeadline,
  formatSetsPerWeek,
} from "./view";

const program = buildProgramFromSeed();

function hist(
  id: string,
  date: string,
  sets: Array<{ weightKg: number; reps: number; isWarmup?: boolean }>,
): Record<string, HistoryEntry[]> {
  return {
    [id]: [
      {
        date,
        sets: sets.map((s, i) => ({
          id: `${id}-${i}`,
          ...s,
          loggedAt: `${date}T18:00:00.000Z`,
        })),
      },
    ],
  };
}

describe("buildPRWall empty / sparse", () => {
  it("returns no cards when history is empty — empty state, not a blank grid", () => {
    expect(buildPRWall({}, program)).toEqual([]);
  });

  it("returns no cards when the only sets are warmups", () => {
    const history = hist("deadlift", "2026-09-06", [
      { weightKg: 20, reps: 10 },
      { weightKg: 200, reps: 3, isWarmup: true },
    ]);
    expect(buildPRWall(history, program)).toEqual([]);
  });

  it("one real PR is a single card, not an empty-looking wall", () => {
    const history = hist("chest-press-machine", "2026-09-06", [
      { weightKg: 20, reps: 12 },
    ]);
    const wall = buildPRWall(history, program);
    expect(wall).toHaveLength(1);
    expect(wall[0].exerciseId).toBe("chest-press-machine");
    expect(wall[0].name).toBe("Chest Press Machine");
    expect(wall[0].prType).toBe("weight");
    expect(formatPRHeadline(wall[0], "kg")).toContain("20");
    expect(formatPRCaption(wall[0])).toContain("12 reps");
  });

  it("labels inverse-weight as assist and reps as reps", () => {
    const mixed = {
      ...hist("weighted-assisted-pullups", "2026-09-05", [
        { weightKg: 26, reps: 12 },
      ]),
      ...hist("push-ups", "2026-09-04", [{ weightKg: 0, reps: 18 }]),
    };
    const wall = buildPRWall(mixed, program);
    const assist = wall.find((i) => i.exerciseId === "weighted-assisted-pullups");
    const reps = wall.find((i) => i.exerciseId === "push-ups");
    expect(assist).toBeTruthy();
    expect(reps).toBeTruthy();
    expect(formatPRHeadline(assist!, "kg")).toMatch(/assist/i);
    expect(formatPRHeadline(reps!, "kg")).toBe("18 reps");
  });

  it("labels >12-rep weight PRs as top-set volume, not a fake 1RM", () => {
    const history = hist("pectoral-fly-machine", "2026-09-06", [
      { weightKg: 20, reps: 15 },
    ]);
    const [item] = buildPRWall(history, program);
    expect(item.record.est1RM).toBeNull();
    expect(formatPRHeadline(item, "kg")).toContain("× 15");
    expect(formatPRCaption(item)).toMatch(/top-set volume/i);
  });
});

describe("formatSetsPerWeek", () => {
  it("keeps halves from secondary credit", () => {
    expect(formatSetsPerWeek(2)).toBe("2 sets / wk");
    expect(formatSetsPerWeek(1.5)).toBe("1.5 sets / wk");
  });
});
