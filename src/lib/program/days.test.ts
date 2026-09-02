import { describe, expect, it } from "vitest";
import { CYCLE_DAYS, resolveProgramDay } from "./days";

describe("resolveProgramDay", () => {
  it("defaults to cycleOrder[pointerIndex] when there is no query param", () => {
    expect(resolveProgramDay(undefined, CYCLE_DAYS, 0)).toBe("push");
    expect(resolveProgramDay(undefined, CYCLE_DAYS, 1)).toBe("pull");
    expect(resolveProgramDay(undefined, CYCLE_DAYS, 4)).toBe("upper");
    expect(resolveProgramDay("", CYCLE_DAYS, 2)).toBe("legs");
  });

  it("lets ?day= override the pointer", () => {
    expect(resolveProgramDay("legs", CYCLE_DAYS, 0)).toBe("legs");
    expect(resolveProgramDay("push", CYCLE_DAYS, 5)).toBe("push");
  });
});
