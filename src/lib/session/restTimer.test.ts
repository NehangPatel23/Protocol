import { describe, expect, it } from "vitest";
import {
  extendRest,
  formatRestClock,
  remainingRestSec,
  replaceRest,
  restDurationSec,
  restEndsAtIso,
} from "./restTimer";

describe("rest timer from stored end-timestamp", () => {
  const t0 = Date.parse("2026-09-01T18:00:00.000Z");

  it("remaining time is computed from the end timestamp, not a running interval", () => {
    const ends = restEndsAtIso(90, t0);
    expect(remainingRestSec(ends, t0)).toBe(90);
    // Simulate a backgrounded tab: 30s of wall time passed with no ticks.
    expect(remainingRestSec(ends, t0 + 30_000)).toBe(60);
    expect(remainingRestSec(ends, t0 + 90_000)).toBe(0);
    expect(remainingRestSec(ends, t0 + 120_000)).toBe(0);
  });

  it("replaceRest always starts a new end timestamp (no parallel timers)", () => {
    const first = replaceRest(90, t0);
    const second = replaceRest(60, t0 + 10_000);
    expect(Date.parse(second.restEndsAt)).toBe(t0 + 10_000 + 60_000);
    expect(second.restDurationSec).toBe(60);
    expect(second.restEndsAt).not.toBe(first.restEndsAt);
  });

  it("extendRest adds onto remaining time, or from now if already expired", () => {
    const ends = restEndsAtIso(30, t0);
    expect(remainingRestSec(extendRest(ends, 15, t0 + 10_000), t0 + 10_000)).toBe(
      35,
    );
    expect(remainingRestSec(extendRest(ends, 15, t0 + 40_000), t0 + 40_000)).toBe(
      15,
    );
  });

  it("uses longer defaults for compounds", () => {
    const defaults = { compoundSec: 180, isolationSec: 90 };
    expect(restDurationSec(true, defaults)).toBe(180);
    expect(restDurationSec(false, defaults)).toBe(90);
  });

  it("formats mm:ss", () => {
    expect(formatRestClock(0)).toBe("0:00");
    expect(formatRestClock(90)).toBe("1:30");
    expect(formatRestClock(5)).toBe("0:05");
  });
});
