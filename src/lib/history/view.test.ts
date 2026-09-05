import { describe, expect, it } from "vitest";
import type { SessionRecord } from "@/lib/db/cardio";
import type { HistoryEntry } from "@/lib/db/history";
import type { CalendarEntry } from "@/lib/program/cycle";
import { buildProgramFromSeed } from "@/lib/program/seed";
import {
  buildSessionList,
  calendarStatusForDate,
  monthGrid,
  sessionForDate,
  sessionsInMonth,
} from "./view";

const program = buildProgramFromSeed();

function historyOn(
  date: string,
  exerciseId: string,
  dayKey: HistoryEntry["dayKey"],
): Record<string, HistoryEntry[]> {
  return {
    [exerciseId]: [
      {
        date,
        dayKey,
        sets: [
          {
            id: "s1",
            weightKg: 25,
            reps: 10,
            loggedAt: `${date}T12:00:00.000Z`,
          },
        ],
      },
    ],
  };
}

describe("monthGrid", () => {
  it("starts September 2026 on Tuesday with Monday-first padding", () => {
    // 2026-09-01 is a Tuesday.
    const cells = monthGrid(2026, 8);
    expect(cells).toHaveLength(42);
    expect(cells[0]?.date).toBeNull();
    expect(cells[1]?.date).toBe("2026-09-01");
    expect(cells[1]?.dayNum).toBe(1);
    expect(cells[30]?.date).toBe("2026-09-30");
    expect(cells[31]?.date).toBeNull();
  });
});

describe("calendarStatusForDate", () => {
  const calendar: Record<string, CalendarEntry> = {
    "2026-09-01": { status: "completed", dayKey: "push" },
    "2026-09-02": { status: "missed", dayKey: "pull" },
    "2026-09-03": { status: "recovery", dayKey: "rest" },
    "2026-09-04": { status: "rest", dayKey: "rest" },
  };

  it("maps each stored status and treats missing keys as blank, not missed", () => {
    expect(calendarStatusForDate(calendar, "2026-09-01")).toBe("completed");
    expect(calendarStatusForDate(calendar, "2026-09-02")).toBe("missed");
    expect(calendarStatusForDate(calendar, "2026-09-03")).toBe("recovery");
    expect(calendarStatusForDate(calendar, "2026-09-04")).toBe("rest");
    expect(calendarStatusForDate(calendar, "2026-09-05")).toBe("blank");
    expect(calendarStatusForDate(calendar, null)).toBe("blank");
  });
});

describe("buildSessionList", () => {
  it("includes completed days with the exercises actually logged that date", () => {
    const calendar: Record<string, CalendarEntry> = {
      "2026-09-01": { status: "completed", dayKey: "push" },
    };
    const history = historyOn("2026-09-01", "chest-press-machine", "push");
    const list = buildSessionList(calendar, history, {}, program);
    expect(list).toHaveLength(1);
    expect(list[0]?.date).toBe("2026-09-01");
    expect(list[0]?.dayKey).toBe("push");
    expect(list[0]?.status).toBe("completed");
    expect(list[0]?.exercises[0]?.name).toBe("Chest Press Machine");
    expect(list[0]?.exercises[0]?.sets).toHaveLength(1);
    expect(list[0]?.durationMin).toBeUndefined();
  });

  it("does not invent duration or volume when Stage 1 never stored them", () => {
    const calendar: Record<string, CalendarEntry> = {
      "2026-09-01": { status: "completed", dayKey: "push" },
    };
    const history = historyOn("2026-09-01", "push-ups", "push");
    const list = buildSessionList(calendar, history, {}, program);
    expect(list[0]?.durationMin).toBeUndefined();
    expect("volume" in (list[0] ?? {})).toBe(false);
  });

  it("shows duration only when the sessions store actually has durationMin", () => {
    const calendar: Record<string, CalendarEntry> = {
      "2026-09-01": { status: "completed", dayKey: "push" },
    };
    const sessions: Record<string, SessionRecord> = {
      "2026-09-01": {
        date: "2026-09-01",
        dayKey: "push",
        type: "program",
        entries: [],
        cardio: null,
        durationMin: 47,
        complete: true,
      },
    };
    const list = buildSessionList(calendar, {}, sessions, program);
    expect(list[0]?.durationMin).toBe(47);
  });

  it("lists recovery days even with no logged sets", () => {
    const calendar: Record<string, CalendarEntry> = {
      "2026-09-03": { status: "recovery", dayKey: "rest" },
    };
    const list = buildSessionList(calendar, {}, {}, program);
    expect(list).toHaveLength(1);
    expect(list[0]?.status).toBe("recovery");
    expect(list[0]?.exercises).toEqual([]);
  });

  it("does not list missed, rest, or blank calendar days as sessions", () => {
    const calendar: Record<string, CalendarEntry> = {
      "2026-09-01": { status: "completed", dayKey: "push" },
      "2026-09-02": { status: "missed", dayKey: "pull" },
      "2026-09-04": { status: "rest", dayKey: "rest" },
    };
    const list = buildSessionList(calendar, {}, {}, program);
    expect(list.map((s) => s.date)).toEqual(["2026-09-01"]);
  });

  it("updates when an entry is added or removed — not a static list", () => {
    const calendar: Record<string, CalendarEntry> = {
      "2026-09-01": { status: "completed", dayKey: "push" },
    };
    const history = historyOn("2026-09-01", "push-ups", "push");
    const first = buildSessionList(calendar, history, {}, program);
    expect(first.map((s) => s.date)).toEqual(["2026-09-01"]);

    const withRecovery: Record<string, CalendarEntry> = {
      ...calendar,
      "2026-09-03": { status: "recovery", dayKey: "rest" },
    };
    const added = buildSessionList(withRecovery, history, {}, program);
    expect(added.map((s) => s.date).sort()).toEqual([
      "2026-09-01",
      "2026-09-03",
    ]);

    const { "2026-09-01": _removed, ...withoutCompleted } = withRecovery;
    const removed = buildSessionList(withoutCompleted, {}, {}, program);
    expect(removed.map((s) => s.date)).toEqual(["2026-09-03"]);
    expect(sessionForDate(removed, "2026-09-01")).toBeUndefined();
  });

  it("does not keep a list row from leftover exerciseHistory or sessions after the calendar entry is deleted", () => {
    const history = historyOn("2026-09-01", "push-ups", "push");
    const sessions: Record<string, SessionRecord> = {
      "2026-09-01": {
        date: "2026-09-01",
        dayKey: "push",
        type: "program",
        entries: [],
        cardio: null,
        complete: true,
      },
    };
    const withCal = buildSessionList(
      { "2026-09-01": { status: "completed", dayKey: "push" } },
      history,
      sessions,
      program,
    );
    expect(withCal.map((s) => s.date)).toEqual(["2026-09-01"]);

    const leftover = buildSessionList({}, history, sessions, program);
    expect(leftover).toEqual([]);
    expect(sessionForDate(leftover, "2026-09-01")).toBeUndefined();
  });

  it("filters the list to the visible month", () => {
    const calendar: Record<string, CalendarEntry> = {
      "2026-08-31": { status: "completed", dayKey: "push" },
      "2026-09-01": { status: "completed", dayKey: "pull" },
    };
    const all = buildSessionList(calendar, {}, {}, program);
    expect(sessionsInMonth(all, 2026, 8).map((s) => s.date)).toEqual([
      "2026-09-01",
    ]);
    expect(sessionsInMonth(all, 2026, 7).map((s) => s.date)).toEqual([
      "2026-08-31",
    ]);
  });
});
