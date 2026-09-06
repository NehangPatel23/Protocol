import { describe, expect, it } from "vitest";
import {
  chooseDifferentDay,
  logChosenDay,
  startProgram,
  type CalendarEntry,
  type CycleState,
} from "@/lib/program/cycle";
import type { DayKey } from "@/lib/program/types";
import {
  persistChooseDifferentDay,
  sessionFromLogChosenDay,
} from "./chooseDay";

const CYCLE: DayKey[] = [
  "push",
  "pull",
  "legs",
  "rest",
  "upper",
  "lower",
  "rest",
];

function memoryCycle() {
  const mem = new Map<string, CycleState>();
  return {
    saveCycle: async (state: CycleState) => {
      mem.set("state", { ...state });
    },
    loadCycle: async () => mem.get("state"),
  };
}

describe("persistChooseDifferentDay", () => {
  it("persists the exact chooseDifferentDay pointer, not a parallel skip path", async () => {
    const pendingDate = "2026-08-24";
    const today = "2026-08-26";
    const started = startProgram(pendingDate);
    const calendar: Record<string, CalendarEntry> = {};
    const direct = chooseDifferentDay(
      started,
      calendar,
      today,
      CYCLE,
      "legs",
    );

    const stored = await persistChooseDifferentDay(
      started,
      calendar,
      today,
      CYCLE,
      "legs",
      memoryCycle(),
    );

    expect(stored.pointerIndex).toBe(direct.state.pointerIndex);
    expect(stored.pendingSince).toBe(direct.state.pendingSince);
    expect(stored.lastEvaluatedDate).toBe(direct.state.lastEvaluatedDate);
    expect(stored.outOfSequenceFrom).toBe(pendingDate);
    expect(direct.calendar[pendingDate]).toBeUndefined();
    expect(direct.calendar[pendingDate]?.status).not.toBe("missed");
  });

  it("does not tag the original pending date missed", async () => {
    const pendingDate = "2026-08-24";
    const started = startProgram(pendingDate);
    await persistChooseDifferentDay(
      started,
      {},
      "2026-08-26",
      CYCLE,
      "legs",
      memoryCycle(),
    );
    const logged = logChosenDay({}, pendingDate, "2026-08-26", "legs");
    expect(logged.calendar[pendingDate]).toBeUndefined();
    expect(logged.session.outOfSequenceBanner).toBe(true);
  });
});

describe("sessionFromLogChosenDay", () => {
  it("copies outOfSequenceBanner from logChosenDay, not a hardcoded true", () => {
    const logged = logChosenDay({}, "2026-08-24", "2026-08-26", "legs");
    const record = sessionFromLogChosenDay(undefined, logged.session);
    expect(record.outOfSequenceBanner).toBe(logged.session.outOfSequenceBanner);
    expect(record.date).toBe(logged.session.date);
    expect(record.dayKey).toBe(logged.session.dayKey);
    expect(record.complete).toBe(true);
  });
});
