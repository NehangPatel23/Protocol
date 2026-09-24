import { describe, expect, it } from "vitest";
import type { HistoryEntry } from "@/lib/db/history";
import type { CalendarEntry } from "@/lib/program/cycle";
import { addLocalDays } from "@/lib/program/cycle";
import { buildProgramFromSeed } from "@/lib/program/seed";
import {
  computeBadges,
  hasFourWeekStreakOn,
  mergeBadges,
  newlyEarned,
} from "./badges";

const program = buildProgramFromSeed();
const today = "2026-09-06";

function completedDays(dates: string[]): Record<string, CalendarEntry> {
  const calendar: Record<string, CalendarEntry> = {};
  for (const date of dates) {
    calendar[date] = { status: "completed", dayKey: "push" };
  }
  return calendar;
}

function prHistory(date: string): Record<string, HistoryEntry[]> {
  return {
    "chest-press-machine": [
      {
        date,
        sets: [
          {
            id: "s1",
            weightKg: 20,
            reps: 12,
            loggedAt: `${date}T18:00:00.000Z`,
          },
        ],
      },
    ],
  };
}

describe("computeBadges", () => {
  it("earns first-pr on the date of the earliest working-set PR, not today", () => {
    const badges = computeBadges(
      prHistory("2026-08-01"),
      {},
      program,
      today,
    );
    expect(badges).toContainEqual({ id: "first-pr", earnedDate: "2026-08-01" });
  });

  it("does not award first-pr for warmup-only history", () => {
    const badges = computeBadges(
      {
        deadlift: [
          {
            date: "2026-08-01",
            sets: [
              {
                id: "wu",
                weightKg: 20,
                reps: 10,
                loggedAt: "2026-08-01T18:00:00.000Z",
              },
            ],
          },
        ],
      },
      {},
      program,
      today,
    );
    expect(badges.find((b) => b.id === "first-pr")).toBeUndefined();
  });

  it("earns 10 sessions on the date of the 10th completed/recovery day", () => {
    const dates = Array.from({ length: 12 }, (_, i) =>
      addLocalDays("2026-08-20", i),
    );
    const calendar = completedDays(dates);
    calendar["2026-08-22"] = { status: "recovery", dayKey: "rest" };
    calendar["2026-08-23"] = { status: "missed", dayKey: "pull" };
    const badges = computeBadges({}, calendar, program, today);
    const ten = badges.find((b) => b.id === "ten-sessions");
    expect(ten?.earnedDate).toBe("2026-08-30");
  });

  it("does not count missed or rest toward 10 sessions", () => {
    const calendar = completedDays(
      Array.from({ length: 9 }, (_, i) => addLocalDays("2026-08-20", i)),
    );
    calendar["2026-08-29"] = { status: "missed", dayKey: "pull" };
    calendar["2026-08-30"] = { status: "rest", dayKey: "rest" };
    expect(
      computeBadges({}, calendar, program, today).find(
        (b) => b.id === "ten-sessions",
      ),
    ).toBeUndefined();
  });
});

describe("four-week streak", () => {
  it("requires a show-up in each of four trailing 7-day windows", () => {
    const calendar = completedDays([
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
    ]);
    expect(hasFourWeekStreakOn(calendar, "2026-08-31")).toBe(true);
    expect(
      computeBadges({}, calendar, program, today).find(
        (b) => b.id === "four-week-streak",
      )?.earnedDate,
    ).toBe("2026-08-31");
  });

  it("fails when one of the four weeks has only a miss", () => {
    const calendar: Record<string, CalendarEntry> = {
      "2026-08-10": { status: "completed", dayKey: "push" },
      "2026-08-17": { status: "completed", dayKey: "pull" },
      "2026-08-24": { status: "missed", dayKey: "legs" },
      "2026-08-31": { status: "completed", dayKey: "upper" },
    };
    expect(hasFourWeekStreakOn(calendar, "2026-08-31")).toBe(false);
  });

  it("counts recovery as showing up", () => {
    const calendar: Record<string, CalendarEntry> = {
      "2026-08-10": { status: "completed", dayKey: "push" },
      "2026-08-17": { status: "recovery", dayKey: "rest" },
      "2026-08-24": { status: "completed", dayKey: "legs" },
      "2026-08-31": { status: "completed", dayKey: "upper" },
    };
    expect(hasFourWeekStreakOn(calendar, "2026-08-31")).toBe(true);
  });
});

describe("mergeBadges", () => {
  it("keeps the earlier earned date and reports only newly stored ids", () => {
    const computed = [
      { id: "first-pr" as const, earnedDate: "2026-08-01" },
      { id: "ten-sessions" as const, earnedDate: "2026-09-01" },
    ];
    const stored = [{ id: "first-pr" as const, earnedDate: "2026-09-06" }];
    const merged = mergeBadges(computed, stored);
    expect(merged.find((b) => b.id === "first-pr")?.earnedDate).toBe(
      "2026-08-01",
    );
    expect(newlyEarned(merged, stored).map((b) => b.id)).toEqual([
      "ten-sessions",
    ]);
  });
});
