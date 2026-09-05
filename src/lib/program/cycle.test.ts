import { describe, expect, it } from "vitest";
import {
  markRecoveryOnCalendar,
  markTrainingDayDone,
  mergeCalendarWrite,
} from "@/lib/db/cycle";
import {
  LONG_GAP_DAYS,
  addLocalDays,
  bootCycle,
  canRevertRecovery,
  chooseDifferentDay,
  completeTrainingDay,
  daysBetween,
  dismissLongGap,
  evaluateCycle,
  explicitStartState,
  inferStarted,
  initialCycleState,
  isMissedPickup,
  jumpToDay,
  logChosenDay,
  nextCycleStartDate,
  persistExplicitStart,
  revertRecoveryDay,
  setDayOverride,
  shouldPromptLongGap,
  shiftPendingToTomorrow,
  startProgram,
  unexplainedGapDays,
  weekdaySuggestedDay,
} from "./cycle";
import type { CalendarEntry, CycleState } from "./cycle";
import type { DayKey } from "./types";

const CYCLE: DayKey[] = [
  "push",
  "pull",
  "legs",
  "rest",
  "upper",
  "lower",
  "rest",
];

describe("evaluateCycle", () => {
  it("does not tag missed days before the program is started", () => {
    const raw = initialCycleState("2026-08-20");
    const { state, writes } = evaluateCycle(raw, "2026-08-29", CYCLE);
    expect(writes).toEqual([]);
    expect(state.started).toBe(false);
    expect(state.pointerIndex).toBe(0);
    expect(state.pendingSince).toBe("2026-08-29");
  });

  it("auto-advances rest days at midnight and writes rest status", () => {
    const started = startProgram("2026-08-23"); // Sunday → pointer 0 = Push; wait we start on a date
    // Force pointer onto the first rest slot (index 3).
    const onRest: typeof started = {
      ...started,
      pointerIndex: 3,
      pendingSince: "2026-08-26",
      lastEvaluatedDate: "2026-08-26",
    };
    const { state, writes } = evaluateCycle(onRest, "2026-08-27", CYCLE);
    expect(writes).toEqual([
      { date: "2026-08-26", entry: { status: "rest", dayKey: "rest" } },
    ]);
    expect(state.pointerIndex).toBe(4);
    expect(state.pendingSince).toBe("2026-08-27");
  });

  it("tags a passed training day as missed once and leaves the pointer", () => {
    const started = startProgram("2026-08-24"); // Monday, Push
    const { state, writes } = evaluateCycle(started, "2026-08-26", CYCLE);
    expect(writes).toEqual([
      { date: "2026-08-24", entry: { status: "missed", dayKey: "push" } },
    ]);
    expect(state.pointerIndex).toBe(0);
    expect(state.pendingSince).toBe("2026-08-24");
    expect(isMissedPickup(state, "2026-08-26", "push")).toBe(true);
  });

  it("does not re-tag later blank days as additional misses", () => {
    const started = startProgram("2026-08-24");
    const first = evaluateCycle(started, "2026-08-25", CYCLE);
    const second = evaluateCycle(first.state, "2026-08-27", CYCLE);
    expect(second.writes).toEqual([]);
    expect(second.state.pointerIndex).toBe(0);
  });

  it("does not double-advance after completeTrainingDay when the next day arrives", () => {
    const started = startProgram("2026-08-24");
    const done = completeTrainingDay(started, "2026-08-24", CYCLE.length);
    expect(done.pointerIndex).toBe(1);
    expect(done.lastCompletedDate).toBe("2026-08-24");
    const next = evaluateCycle(done, "2026-08-25", CYCLE);
    expect(next.state.pointerIndex).toBe(1);
    expect(next.writes).toEqual([]);
    expect(next.state.pendingSince).toBe("2026-08-25");
  });

  it("does not treat the completed training date as Rest after finishing the day before a Rest slot", () => {
    const started = startProgram("2026-08-24");
    const afterPush = completeTrainingDay(started, "2026-08-24", CYCLE.length);
    const afterPull = completeTrainingDay(afterPush, "2026-08-25", CYCLE.length);
    const afterLegs = completeTrainingDay(afterPull, "2026-08-26", CYCLE.length);
    expect(afterLegs.pointerIndex).toBe(3);
    expect(CYCLE[afterLegs.pointerIndex]).toBe("rest");

    const thursday = evaluateCycle(afterLegs, "2026-08-27", CYCLE);
    expect(thursday.writes).toEqual([]);
    expect(thursday.state.pointerIndex).toBe(3);
    expect(thursday.state.pendingSince).toBe("2026-08-27");

    const friday = evaluateCycle(thursday.state, "2026-08-28", CYCLE);
    expect(friday.writes).toEqual([
      { date: "2026-08-27", entry: { status: "rest", dayKey: "rest" } },
    ]);
    expect(friday.state.pointerIndex).toBe(4);
    expect(CYCLE[friday.state.pointerIndex]).toBe("upper");
  });
});

describe("soreness swap", () => {
  it("keeps the pointer and shifts pendingSince to tomorrow", () => {
    const started = startProgram("2026-08-24");
    const swapped = shiftPendingToTomorrow(started, "2026-08-24");
    expect(swapped.pointerIndex).toBe(0);
    expect(swapped.pendingSince).toBe("2026-08-25");
    expect(swapped.recoveryRevert).toEqual({
      date: "2026-08-24",
      pendingSince: "2026-08-24",
    });
  });

  it("same-day undo restores pendingSince and does not move the pointer", () => {
    const started = startProgram("2026-08-24");
    const swapped = shiftPendingToTomorrow(started, "2026-08-24");
    expect(canRevertRecovery(swapped, "2026-08-24")).toBe(true);
    const undone = revertRecoveryDay(swapped, "2026-08-24");
    expect(undone.pendingSince).toBe("2026-08-24");
    expect(undone.pointerIndex).toBe(0);
    expect(undone.recoveryRevert).toBeNull();
  });

  it("blocks undo after another session is completed the same day", () => {
    const started = startProgram("2026-08-24");
    const swapped = shiftPendingToTomorrow(started, "2026-08-24");
    const completed = completeTrainingDay(swapped, "2026-08-24", CYCLE.length);
    expect(canRevertRecovery(completed, "2026-08-24")).toBe(false);
    expect(revertRecoveryDay(completed, "2026-08-24")).toEqual(completed);
  });

  it("consecutive recovery days do not count toward the long-gap prompt", () => {
    let state = startProgram("2026-08-20");
    state = shiftPendingToTomorrow(state, "2026-08-20");
    state = evaluateCycle(state, "2026-08-21", CYCLE).state;
    state = shiftPendingToTomorrow(state, "2026-08-21");
    state = evaluateCycle(state, "2026-08-22", CYCLE).state;
    state = shiftPendingToTomorrow(state, "2026-08-22");
    state = evaluateCycle(state, "2026-08-26", CYCLE).state;
    expect(unexplainedGapDays(state, "2026-08-26")).toBeLessThanOrEqual(
      LONG_GAP_DAYS,
    );
    expect(shouldPromptLongGap(state, "2026-08-26")).toBe(false);
  });
});

describe("long-gap prompt", () => {
  it("prompts after more than 5 unexplained pending days", () => {
    const started = startProgram("2026-08-20");
    const later = evaluateCycle(started, "2026-08-26", CYCLE).state;
    expect(unexplainedGapDays(later, "2026-08-26")).toBe(6);
    expect(shouldPromptLongGap(later, "2026-08-26")).toBe(true);
  });

  it("does not re-prompt after dismiss for the same pendingSince", () => {
    const started = startProgram("2026-08-20");
    const later = evaluateCycle(started, "2026-08-26", CYCLE).state;
    const dismissed = dismissLongGap(later);
    expect(shouldPromptLongGap(dismissed, "2026-08-26")).toBe(false);
  });

  it("jumpToDay moves the pointer without rewriting history", () => {
    const started = startProgram("2026-08-20");
    const later = evaluateCycle(started, "2026-08-26", CYCLE).state;
    const jumped = jumpToDay(later, "2026-08-26", CYCLE, "upper");
    expect(jumped.pointerIndex).toBe(4);
    expect(jumped.pendingSince).toBe("2026-08-26");
    expect(shouldPromptLongGap(jumped, "2026-08-26")).toBe(false);
  });
});

describe("helpers", () => {
  it("weekdaySuggestedDay maps a Wednesday to Legs in the default cycle", () => {
    expect(weekdaySuggestedDay("2026-08-26", CYCLE)).toBe("legs");
  });

  it("daysBetween is calendar-date based", () => {
    expect(daysBetween("2026-08-20", "2026-08-26")).toBe(6);
    expect(addLocalDays("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("inferStarted treats legacy records with a start date as started", () => {
    const legacy = { ...initialCycleState("2026-08-20") };
    delete legacy.started;
    expect(inferStarted(legacy, {}, "2026-08-20")).toBe(true);
    expect(inferStarted(initialCycleState("2026-08-20"), {}, null)).toBe(false);
  });

  it("does not treat an explicit started:false as started just because cycleStartDate exists", () => {
    const unstarted = initialCycleState("2026-08-20");
    expect(unstarted.started).toBe(false);
    expect(inferStarted(unstarted, {}, "2026-08-20")).toBe(false);
  });

  it("setDayOverride is scoped to that calendar date", () => {
    const started = startProgram("2026-08-24");
    const over = setDayOverride(started, "2026-08-24", "legs");
    expect(over.dayOverride).toEqual({ date: "2026-08-24", dayKey: "legs" });
    const cleared = setDayOverride(over, "2026-08-24", "push", "push");
    expect(cleared.dayOverride).toBeNull();
  });

  it("inferStarted treats calendar evidence as already started", () => {
    const fresh = initialCycleState("2026-08-20");
    expect(
      inferStarted(fresh, { "2026-08-20": { status: "completed", dayKey: "push" } }, null),
    ).toBe(true);
  });
});

describe("mark-done must not clobber recovery", () => {
  const date = "2026-08-24";

  it("leaves a recovery entry as recovery after mark-done", () => {
    const calendar = markRecoveryOnCalendar({}, date);
    expect(calendar[date]?.status).toBe("recovery");
    const after = markTrainingDayDone(calendar, date, "push");
    expect(after[date]?.status).toBe("recovery");
    expect(after[date]).toEqual(calendar[date]);
  });

  it("midnight missed-write also refuses to overwrite recovery", () => {
    const started = startProgram(date);
    const calendar = markRecoveryOnCalendar({}, date);
    const { writes } = evaluateCycle(started, "2026-08-25", CYCLE);
    let next = calendar;
    for (const w of writes) {
      next = mergeCalendarWrite(next, w.date, w.entry);
    }
    expect(next[date]?.status).toBe("recovery");
  });

  it("reverse order is reachable: completed stays completed if recovery is confirmed later", () => {
    // Defense in depth: Home hides "Feeling sore" once today is settled,
    // but markRecoveryOnCalendar must still refuse to clobber completed.
    const calendar = markTrainingDayDone({}, date, "push");
    expect(calendar[date]?.status).toBe("completed");
    const after = markRecoveryOnCalendar(calendar, date);
    expect(after[date]?.status).toBe("completed");
  });
});

describe("long-gap prompt boundaries", () => {
  it("does not fire after 4 unexplained blank days", () => {
    const started = startProgram("2026-08-20");
    const later = evaluateCycle(started, "2026-08-24", CYCLE).state;
    expect(unexplainedGapDays(later, "2026-08-24")).toBe(4);
    expect(shouldPromptLongGap(later, "2026-08-24")).toBe(false);
  });

  it("does not fire at exactly 5 unexplained days (spec: more than ~5)", () => {
    const started = startProgram("2026-08-20");
    const later = evaluateCycle(started, "2026-08-25", CYCLE).state;
    expect(unexplainedGapDays(later, "2026-08-25")).toBe(5);
    expect(shouldPromptLongGap(later, "2026-08-25")).toBe(false);
  });

  it("fires after 6 unexplained blank days (first day past the >5 boundary)", () => {
    const started = startProgram("2026-08-20");
    const later = evaluateCycle(started, "2026-08-26", CYCLE).state;
    expect(unexplainedGapDays(later, "2026-08-26")).toBe(6);
    expect(unexplainedGapDays(later, "2026-08-26")).toBeGreaterThan(LONG_GAP_DAYS);
    expect(shouldPromptLongGap(later, "2026-08-26")).toBe(true);
  });

  it("does not fire for 5 consecutive recovery days, regardless of count", () => {
    const pending = "2026-08-20";
    const today = "2026-08-25";
    const started = startProgram(pending);
    const calendar: Record<string, CalendarEntry> = {};
    for (let i = 0; i < 5; i++) {
      const d = addLocalDays(pending, i);
      calendar[d] = { status: "recovery", dayKey: "rest" };
    }
    const later = evaluateCycle(started, today, CYCLE).state;
    expect(unexplainedGapDays(later, today, calendar)).toBe(0);
    expect(shouldPromptLongGap(later, today, calendar)).toBe(false);
  });

  it("does not fire for 6 consecutive recovery days either (count is irrelevant)", () => {
    const pending = "2026-08-20";
    const today = "2026-08-26";
    const started = startProgram(pending);
    const calendar: Record<string, CalendarEntry> = {};
    for (let i = 0; i < 6; i++) {
      calendar[addLocalDays(pending, i)] = { status: "recovery", dayKey: "rest" };
    }
    const later = evaluateCycle(started, today, CYCLE).state;
    expect(shouldPromptLongGap(later, today, calendar)).toBe(false);
  });
});

describe("choose a different day", () => {
  it("leaves the original pending date blank, then flags the logged session", () => {
    const pendingDate = "2026-08-24";
    const logDate = "2026-08-26";
    const started = startProgram(pendingDate);
    const calendar: Record<string, CalendarEntry> = {};

    const chosen = chooseDifferentDay(
      started,
      calendar,
      logDate,
      CYCLE,
      "legs",
    );
    expect(chosen.calendar[pendingDate]).toBeUndefined();
    expect(chosen.calendar[logDate]).toBeUndefined();
    expect(chosen.state.pointerIndex).toBe(2);

    const logged = logChosenDay(
      chosen.calendar,
      pendingDate,
      logDate,
      "legs",
    );
    expect(logged.calendar[pendingDate]).toBeUndefined();
    expect(logged.calendar[pendingDate]?.status).not.toBe("missed");
    expect(logged.calendar[logDate]).toEqual({
      status: "completed",
      dayKey: "legs",
    });
    expect(logged.session.outOfSequenceBanner).toBe(true);
    expect(logged.session.date).toBe(logDate);
  });
});

describe("bootCycle", () => {
  it("boot alone does not set started or produce missed calendar entries", () => {
    const { state, writes } = bootCycle(null, {}, null, "2026-08-29", CYCLE);
    expect(state.started).toBe(false);
    expect(writes).toEqual([]);
    expect(writes.some((w) => w.entry.status === "missed")).toBe(false);
  });

  it("a later boot with no explicit start still does not tag misses", () => {
    const first = bootCycle(null, {}, null, "2026-08-20", CYCLE);
    expect(first.state.started).toBe(false);
    const later = bootCycle(first.state, {}, null, "2026-08-29", CYCLE);
    expect(later.state.started).toBe(false);
    expect(later.writes).toEqual([]);
    expect(later.writes.some((w) => w.entry.status === "missed")).toBe(false);
  });

  it("still infers started from calendar evidence (legacy data)", () => {
    const calendar = {
      "2026-08-20": { status: "completed" as const, dayKey: "push" as const },
    };
    const { state } = bootCycle(
      initialCycleState("2026-08-20"),
      calendar,
      null,
      "2026-08-22",
      CYCLE,
    );
    expect(state.started).toBe(true);
  });

  it("does not flip started to true from cycleStartDate when the store says false", () => {
    const stored = initialCycleState("2026-08-20");
    const { state, writes } = bootCycle(
      stored,
      {},
      "2026-08-20",
      "2026-08-29",
      CYCLE,
    );
    expect(state.started).toBe(false);
    expect(writes).toEqual([]);
  });
});

describe("nextCycleStartDate", () => {
  it("is write-once: an existing date is never replaced", () => {
    expect(nextCycleStartDate("2026-01-15", "2026-08-31")).toBe("2026-01-15");
  });

  it("records today only when none exists", () => {
    expect(nextCycleStartDate(null, "2026-08-31")).toBe("2026-08-31");
  });
});

describe("persistExplicitStart", () => {
  it("re-reads started === true from the store after the start action", async () => {
    const mem = new Map<string, CycleState>();
    const save = async (state: CycleState) => {
      mem.set("state", { ...state });
    };
    const load = async () => mem.get("state");

    await save(initialCycleState("2026-08-31"));
    expect((await load())?.started).toBe(false);

    const stored = await persistExplicitStart("2026-08-31", CYCLE, {
      save,
      load,
    });
    expect(stored.started).toBe(true);
    expect((await load())?.started).toBe(true);
    expect((await load())?.pendingSince).toBe("2026-08-31");
  });

  it("throws and leaves the caller unstarted if save is a no-op", async () => {
    const mem: CycleState = initialCycleState("2026-08-31");
    const save = async () => {
      /* swallow — the History-class bug: UI would look started, store would not */
    };
    const load = async () => mem;

    await expect(
      persistExplicitStart("2026-08-31", CYCLE, { save, load }),
    ).rejects.toThrow(/started: true/);
    expect(mem.started).toBe(false);
  });

  it("goes through startProgram — bootCycle alone cannot produce started: true", async () => {
    const mem = new Map<string, CycleState>();
    const save = async (state: CycleState) => {
      mem.set("state", { ...state });
    };
    const load = async () => mem.get("state");

    const booted = bootCycle(null, {}, null, "2026-08-31", CYCLE);
    expect(booted.state.started).toBe(false);

    await persistExplicitStart("2026-08-31", CYCLE, { save, load });
    expect((await load())?.started).toBe(true);
  });

  it("a persistenceOk===false style skip (in-memory start, no save) leaves the store empty", async () => {
    const mem = new Map<string, CycleState>();
    const load = async () => mem.get("state");
    // This is what ProgramProvider used to do: paint started without save.
    const painted = explicitStartState("2026-09-01", CYCLE);
    expect(painted.started).toBe(true);
    expect(await load()).toBeUndefined();
    expect(mem.size).toBe(0);
  });
});

