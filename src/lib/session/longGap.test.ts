import { describe, expect, it } from "vitest";
import {
  dismissLongGap,
  evaluateCycle,
  jumpToDay,
  shouldPromptLongGap,
  startProgram,
  weekdaySuggestedDay,
  type CycleState,
} from "@/lib/program/cycle";
import type { DayKey } from "@/lib/program/types";
import { persistLongGapJump, persistLongGapPickup } from "./longGap";

const CYCLE: DayKey[] = [
  "push",
  "pull",
  "legs",
  "rest",
  "upper",
  "lower",
  "rest",
];

function memoryCycle(initial?: CycleState) {
  const mem = new Map<string, CycleState>();
  if (initial) mem.set("state", { ...initial });
  return {
    save: async (state: CycleState) => {
      mem.set("state", { ...state });
    },
    load: async () => mem.get("state"),
  };
}

describe("persistLongGapPickup", () => {
  it("is dismissLongGap — not a local 'don't ask again' flag", async () => {
    const later = evaluateCycle(
      startProgram("2026-08-20"),
      "2026-08-26",
      CYCLE,
    ).state;
    expect(shouldPromptLongGap(later, "2026-08-26")).toBe(true);

    const stored = await persistLongGapPickup(later, memoryCycle());
    expect(stored).toEqual(dismissLongGap(later));
    expect(shouldPromptLongGap(stored, "2026-08-26")).toBe(false);
  });
});

describe("persistLongGapJump", () => {
  it("jumps to weekdaySuggestedDay via jumpToDay, not a reimplemented weekday map", async () => {
    const today = "2026-08-26";
    const later = evaluateCycle(
      startProgram("2026-08-20"),
      today,
      CYCLE,
    ).state;
    const suggested = weekdaySuggestedDay(today, CYCLE);
    expect(suggested).toBe("legs");

    const stored = await persistLongGapJump(
      later,
      today,
      CYCLE,
      memoryCycle(),
    );
    expect(stored).toEqual(jumpToDay(later, today, CYCLE, suggested));
    expect(stored.pointerIndex).toBe(2);
    expect(stored.pendingSince).toBe(today);
    expect(shouldPromptLongGap(stored, today)).toBe(false);
  });
});
