import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CardioLog } from "./cardio";

const getStoreValue = vi.hoisted(() => vi.fn());
const setStoreValue = vi.hoisted(() => vi.fn());

vi.mock("./index", () => ({
  getStoreValue,
  setStoreValue,
}));

import { upsertSessionCardio } from "./sessions";

const CARDIO: CardioLog = {
  activity: "Treadmill",
  durationMin: 10,
  distance: 1.2,
  distanceUnit: "mi",
  inclinePct: 2,
  speed: 3.5,
  speedUnit: "mph",
  resistanceLevel: null,
  avgHrBpm: null,
  notes: null,
  loggedAt: "2026-08-31T12:00:00.000Z",
};

describe("upsertSessionCardio", () => {
  beforeEach(() => {
    getStoreValue.mockReset();
    setStoreValue.mockReset();
    setStoreValue.mockResolvedValue(undefined);
  });

  it("creates a session stub and persists the cardio finisher", async () => {
    getStoreValue.mockResolvedValue(undefined);
    const saved = await upsertSessionCardio("2026-08-31", "push", CARDIO);
    expect(saved.cardio).toEqual(CARDIO);
    expect(saved.dayKey).toBe("push");
    expect(setStoreValue).toHaveBeenCalledWith(
      "sessions",
      "2026-08-31",
      expect.objectContaining({
        date: "2026-08-31",
        dayKey: "push",
        cardio: CARDIO,
      }),
    );
  });
});
