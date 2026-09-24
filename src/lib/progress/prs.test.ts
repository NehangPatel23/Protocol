import { describe, expect, it } from "vitest";
import { epley1RM } from "@/lib/program/format";
import { buildProgramFromSeed } from "@/lib/program/seed";
import type { HistoryEntry, HistorySet } from "@/lib/db/history";
import {
  beats,
  bestPRFromHistory,
  isExcludedFromPR,
  matchesWarmupPattern,
  setEstablishesPR,
  shouldFlagWarmup,
  toPersonalRecord,
  warmupPrescriptionFor,
  type PersonalRecord,
} from "./prs";

const program = buildProgramFromSeed();
const deadliftWarmup = warmupPrescriptionFor(program, "deadlift");

function set(
  partial: Partial<HistorySet> & Pick<HistorySet, "weightKg" | "reps">,
): HistorySet {
  return {
    id: partial.id ?? "s",
    loggedAt: partial.loggedAt ?? "2026-09-06T18:00:00.000Z",
    isWarmup: partial.isWarmup,
    weightKg: partial.weightKg,
    reps: partial.reps,
  };
}

function entry(
  date: string,
  sets: HistorySet[],
): HistoryEntry {
  return { date, sets };
}

describe("warmup exclusion", () => {
  it("matches the deadlift programmed warmup (3×10 @ 20 kg) without a flag", () => {
    expect(deadliftWarmup).toEqual({
      sets: 3,
      reps: "10",
      weight: { kg: [20], lb: [44] },
    });
    expect(matchesWarmupPattern(set({ weightKg: 20, reps: 10 }), deadliftWarmup)).toBe(
      true,
    );
    expect(isExcludedFromPR(set({ weightKg: 20, reps: 10 }), deadliftWarmup)).toBe(
      true,
    );
  });

  it("treats 44 lb logged as kg (~19.96) as the deadlift warmup, not a working set", () => {
    const fromLb = 44 / 2.2046226218;
    expect(matchesWarmupPattern(set({ weightKg: fromLb, reps: 10 }), deadliftWarmup)).toBe(
      true,
    );
  });

  it("does not treat a 20 kg × 3 working deadlift as a warmup", () => {
    expect(matchesWarmupPattern(set({ weightKg: 20, reps: 3 }), deadliftWarmup)).toBe(
      false,
    );
  });

  it("excludes an explicitly flagged warmup even when it is heavier than any working set", () => {
    const history = [
      entry("2026-09-01", [set({ id: "w", weightKg: 50, reps: 3 })]),
      entry("2026-09-06", [
        set({ id: "wu", weightKg: 200, reps: 3, isWarmup: true }),
      ]),
    ];
    const pr = bestPRFromHistory(history, "weight", deadliftWarmup);
    expect(pr).toEqual(toPersonalRecord({ weightKg: 50, reps: 3, date: "2026-09-01" }, "weight"));
    expect(pr?.weightKg).toBe(50);
  });

  it("shouldFlagWarmup is true for a flagged set and for the deadlift pattern", () => {
    expect(
      shouldFlagWarmup(
        { weightKg: 200, reps: 3, isWarmup: true },
        program,
        "deadlift",
        "pull",
      ),
    ).toBe(true);
    expect(
      shouldFlagWarmup({ weightKg: 20, reps: 10 }, program, "deadlift", "pull"),
    ).toBe(true);
    expect(
      shouldFlagWarmup({ weightKg: 50, reps: 3 }, program, "deadlift", "pull"),
    ).toBe(false);
  });
});

describe("prType: weight", () => {
  it("higher weight is a PR", () => {
    const current: PersonalRecord = toPersonalRecord(
      { weightKg: 40, reps: 8, date: "2026-09-01" },
      "weight",
    );
    expect(beats({ weightKg: 45, reps: 8, date: "2026-09-06" }, current, "weight")).toBe(
      true,
    );
    expect(beats({ weightKg: 40, reps: 8, date: "2026-09-06" }, current, "weight")).toBe(
      false,
    );
  });

  it("higher estimated 1RM at lower weight still counts (never raw weight alone)", () => {
    // 100 kg × 1 observed 1RM = 100; 80 kg × 8 Epley = 80 * (1+8/30) ≈ 101.33
    const current = toPersonalRecord(
      { weightKg: 100, reps: 1, date: "2026-09-01" },
      "weight",
    );
    expect(current.est1RM).toBe(100);
    expect(epley1RM(80, 8)).toBeGreaterThan(100);
    expect(beats({ weightKg: 80, reps: 8, date: "2026-09-06" }, current, "weight")).toBe(
      true,
    );
  });

  it("higher est. 1RM at equal reps is a PR", () => {
    const current = toPersonalRecord(
      { weightKg: 80, reps: 8, date: "2026-09-01" },
      "weight",
    );
    expect(beats({ weightKg: 82.5, reps: 8, date: "2026-09-06" }, current, "weight")).toBe(
      true,
    );
  });

  it("a 1-rep set stores the observed max, not Epley inflation", () => {
    const pr = toPersonalRecord(
      { weightKg: 90, reps: 1, date: "2026-09-06" },
      "weight",
    );
    expect(epley1RM(90, 1)).toBe(90);
    expect(pr.est1RM).toBe(90);
  });
});

describe("prType: weight — 12-rep 1RM cutoff", () => {
  it("does not fabricate an Epley 1RM for a 15-rep set", () => {
    expect(epley1RM(20, 15)).toBeNull();
    const pr = toPersonalRecord(
      { weightKg: 20, reps: 15, date: "2026-09-06" },
      "weight",
    );
    expect(pr.est1RM).toBeNull();
  });

  it("12-rep sets still get Epley; 13-rep sets do not", () => {
    expect(epley1RM(22, 12)).toBe(22 * (1 + 12 / 30));
    expect(epley1RM(22, 13)).toBeNull();
  });

  it("above 12 reps, more volume at the same weight is a PR — not a fake 1RM", () => {
    const current = toPersonalRecord(
      { weightKg: 20, reps: 15, date: "2026-09-01" },
      "weight",
    );
    expect(current.est1RM).toBeNull();
    expect(beats({ weightKg: 20, reps: 16, date: "2026-09-06" }, current, "weight")).toBe(
      true,
    );
    expect(beats({ weightKg: 20, reps: 14, date: "2026-09-06" }, current, "weight")).toBe(
      false,
    );
  });

  it("a 15-rep set does not beat a 12-rep set of equal weight via invented 1RM", () => {
    // 20×12 Epley = 28; a fake 20×15 Epley would be 30 — that path is closed.
    const current = toPersonalRecord(
      { weightKg: 20, reps: 12, date: "2026-09-01" },
      "weight",
    );
    expect(current.est1RM).toBe(20 * (1 + 12 / 30));
    expect(beats({ weightKg: 20, reps: 15, date: "2026-09-06" }, current, "weight")).toBe(
      false,
    );
  });

  it("higher weight still PRs when moving from a high-rep set into the 1RM regime", () => {
    const current = toPersonalRecord(
      { weightKg: 20, reps: 15, date: "2026-09-01" },
      "weight",
    );
    expect(beats({ weightKg: 22, reps: 12, date: "2026-09-06" }, current, "weight")).toBe(
      true,
    );
  });
});

describe("prType: reps (bodyweight)", () => {
  it("most reps completed is the PR, not a weight number", () => {
    const current = toPersonalRecord(
      { weightKg: 0, reps: 12, date: "2026-09-01" },
      "reps",
    );
    expect(beats({ weightKg: 0, reps: 15, date: "2026-09-06" }, current, "reps")).toBe(
      true,
    );
    expect(beats({ weightKg: 0, reps: 12, date: "2026-09-06" }, current, "reps")).toBe(
      false,
    );
    expect(beats({ weightKg: 20, reps: 10, date: "2026-09-06" }, current, "reps")).toBe(
      false,
    );
  });

  it("bestPRFromHistory on push-ups keeps the highest-rep set", () => {
    const history = [
      entry("2026-09-01", [set({ weightKg: 0, reps: 10 })]),
      entry("2026-09-03", [set({ weightKg: 0, reps: 14 })]),
      entry("2026-09-06", [set({ weightKg: 0, reps: 12 })]),
    ];
    const pr = bestPRFromHistory(history, "reps");
    expect(pr).toMatchObject({ reps: 14, date: "2026-09-03", est1RM: null });
  });
});

describe("prType: inverse-weight (assisted pull-up machine)", () => {
  it("LESS assist at the same reps is a PR — more assist is not", () => {
    const current = toPersonalRecord(
      { weightKg: 31.25, reps: 12, date: "2026-09-01" },
      "inverse-weight",
    );
    expect(
      beats({ weightKg: 26, reps: 12, date: "2026-09-06" }, current, "inverse-weight"),
    ).toBe(true);
    expect(
      beats({ weightKg: 35, reps: 12, date: "2026-09-06" }, current, "inverse-weight"),
    ).toBe(false);
  });

  it("less assist with fewer reps is NOT a PR (same/more reps required)", () => {
    const current = toPersonalRecord(
      { weightKg: 26, reps: 15, date: "2026-09-01" },
      "inverse-weight",
    );
    expect(
      beats({ weightKg: 20, reps: 8, date: "2026-09-06" }, current, "inverse-weight"),
    ).toBe(false);
    expect(
      beats({ weightKg: 20, reps: 15, date: "2026-09-06" }, current, "inverse-weight"),
    ).toBe(true);
  });

  it("same assist with more reps is a PR", () => {
    const current = toPersonalRecord(
      { weightKg: 26, reps: 12, date: "2026-09-01" },
      "inverse-weight",
    );
    expect(
      beats({ weightKg: 26, reps: 15, date: "2026-09-06" }, current, "inverse-weight"),
    ).toBe(true);
  });

  it("does not treat less assist as worse the way a normal weight PR would", () => {
    const history = [
      entry("2026-09-01", [set({ weightKg: 31.25, reps: 12 })]),
      entry("2026-09-06", [set({ weightKg: 26, reps: 12 })]),
    ];
    // If this were 'weight', 31.25 would win. Inverse must keep 26.
    expect(bestPRFromHistory(history, "weight")?.weightKg).toBe(31.25);
    expect(bestPRFromHistory(history, "inverse-weight")?.weightKg).toBe(26);
    expect(bestPRFromHistory(history, "inverse-weight")?.date).toBe("2026-09-06");
  });
});

describe("setEstablishesPR + history sequence", () => {
  it("first working set is a PR; a later worse set is not; a later better set is", () => {
    const first = set({ id: "a", weightKg: 40, reps: 8 });
    expect(setEstablishesPR(first, "2026-09-01", null, "weight")).toBe(true);
    const afterFirst = bestPRFromHistory(
      [entry("2026-09-01", [first])],
      "weight",
    );
    expect(
      setEstablishesPR(
        set({ id: "b", weightKg: 35, reps: 8 }),
        "2026-09-02",
        afterFirst,
        "weight",
      ),
    ).toBe(false);
    expect(
      setEstablishesPR(
        set({ id: "c", weightKg: 45, reps: 8 }),
        "2026-09-03",
        afterFirst,
        "weight",
      ),
    ).toBe(true);
  });

  it("a warmup never establishes a PR even as the first logged set", () => {
    const wu = set({ weightKg: 200, reps: 3, isWarmup: true });
    expect(setEstablishesPR(wu, "2026-09-06", null, "weight", deadliftWarmup)).toBe(
      false,
    );
    expect(bestPRFromHistory([entry("2026-09-06", [wu])], "weight", deadliftWarmup)).toBe(
      null,
    );
  });

  it("zero-rep failed sets never become a PR", () => {
    expect(
      setEstablishesPR(set({ weightKg: 50, reps: 0 }), "2026-09-06", null, "weight"),
    ).toBe(false);
  });
});
