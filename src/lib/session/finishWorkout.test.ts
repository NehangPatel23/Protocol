import { describe, expect, it } from "vitest";
import {
  markRecoveryOnCalendar,
  markTrainingDayDone,
  mergeCalendarWrite,
} from "@/lib/db/cycle";
import {
  completeTrainingDay,
  evaluateCycle,
  initialCycleState,
  isMissedPickup,
  startProgram,
  type CalendarEntry,
  type CycleState,
} from "@/lib/program/cycle";
import type { DayKey } from "@/lib/program/types";
import {
  applyFinishWorkout,
  persistFinishedWorkout,
  type FinishWorkoutPersistence,
} from "./finishWorkout";

const CYCLE: DayKey[] = [
  "push",
  "pull",
  "legs",
  "rest",
  "upper",
  "lower",
  "rest",
];

function memoryPersistence(): FinishWorkoutPersistence & {
  cycleMem: Map<string, CycleState>;
  calMem: Map<string, Record<string, CalendarEntry>>;
  sessionCleared: boolean;
} {
  const cycleMem = new Map<string, CycleState>();
  const calMem = new Map<string, Record<string, CalendarEntry>>();
  const box = {
    cycleMem,
    calMem,
    sessionCleared: false,
    saveCycle: async (state: CycleState) => {
      cycleMem.set("state", { ...state });
    },
    loadCycle: async () => cycleMem.get("state"),
    saveCalendar: async (calendar: Record<string, CalendarEntry>) => {
      calMem.set("days", { ...calendar });
    },
    loadCalendar: async () => calMem.get("days") ?? {},
    clearActiveSession: async () => {
      box.sessionCleared = true;
    },
  };
  return box;
}

describe("applyFinishWorkout", () => {
  it("produces the same cycle and calendar as calling completeTrainingDay and markTrainingDayDone directly", () => {
    const cycle = startProgram("2026-08-24");
    const calendar: Record<string, CalendarEntry> = {};

    const viaFlow = applyFinishWorkout(
      cycle,
      calendar,
      "2026-08-24",
      "push",
      CYCLE.length,
    );
    const directCycle = completeTrainingDay(cycle, "2026-08-24", CYCLE.length);
    const directCal = markTrainingDayDone(calendar, "2026-08-24", "push");

    expect(viaFlow.cycle).toEqual(directCycle);
    expect(viaFlow.calendar).toEqual(directCal);
    expect(viaFlow.calendar["2026-08-24"]?.status).toBe("completed");
    expect(viaFlow.cycle.pointerIndex).toBe(1);
    expect(viaFlow.cycle.lastCompletedDate).toBe("2026-08-24");
  });

  it("does not invent a parallel pointer path — unstarted state still goes through completeTrainingDay", () => {
    const raw = initialCycleState("2026-08-24");
    const viaFlow = applyFinishWorkout(raw, {}, "2026-08-24", "push", CYCLE.length);
    expect(viaFlow.cycle).toEqual(
      completeTrainingDay(raw, "2026-08-24", CYCLE.length),
    );
  });

  it("refuses to overwrite recovery and does not advance the pointer", () => {
    const cycle = startProgram("2026-08-24");
    const calendar = markRecoveryOnCalendar({}, "2026-08-24");
    const viaFlow = applyFinishWorkout(
      cycle,
      calendar,
      "2026-08-24",
      "push",
      CYCLE.length,
    );
    expect(viaFlow.calendar["2026-08-24"]?.status).toBe("recovery");
    expect(viaFlow.cycle).toEqual(cycle);
    expect(viaFlow.cycle.pointerIndex).toBe(0);
  });
});

describe("persistFinishedWorkout", () => {
  it("re-reads completed calendar and advanced pointer after save, then clears the session", async () => {
    const persistence = memoryPersistence();
    const started = startProgram("2026-08-24");
    const stored = await persistFinishedWorkout(
      started,
      {},
      "2026-08-24",
      "push",
      CYCLE.length,
      persistence,
    );

    const direct = completeTrainingDay(started, "2026-08-24", CYCLE.length);
    expect(stored.cycle).toEqual(direct);
    expect(stored.calendar["2026-08-24"]?.status).toBe("completed");
    expect(stored.calendar["2026-08-24"]?.dayKey).toBe("push");
    expect(stored.cycle.pointerIndex).toBe(direct.pointerIndex);
    expect(persistence.sessionCleared).toBe(true);
    expect((await persistence.loadCycle())?.pointerIndex).toBe(1);
    expect((await persistence.loadCalendar())["2026-08-24"]?.status).toBe(
      "completed",
    );
  });

  it("does not return until the calendar re-read shows completed", async () => {
    const cycleMem = new Map<string, CycleState>();
    const calMem = new Map<string, Record<string, CalendarEntry>>();
    let releaseSave: () => void = () => {};
    const saveGate = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    let returned = false;

    const persistence: FinishWorkoutPersistence = {
      saveCycle: async (state) => {
        cycleMem.set("state", { ...state });
      },
      loadCycle: async () => cycleMem.get("state"),
      saveCalendar: async (calendar) => {
        await saveGate;
        calMem.set("days", { ...calendar });
      },
      loadCalendar: async () => calMem.get("days") ?? {},
      clearActiveSession: async () => {},
    };

    const pending = persistFinishedWorkout(
      startProgram("2026-08-24"),
      {},
      "2026-08-24",
      "push",
      CYCLE.length,
      persistence,
    ).then((result) => {
      returned = true;
      return result;
    });

    await Promise.resolve();
    expect(returned).toBe(false);
    expect(calMem.size).toBe(0);
    expect(cycleMem.size).toBe(0);

    releaseSave();
    const stored = await pending;
    expect(returned).toBe(true);
    expect(stored.calendar["2026-08-24"]?.status).toBe("completed");
    expect(stored.cycle.pointerIndex).toBe(1);
  });

  it("throws and does not persist the pointer if calendar save is a no-op", async () => {
    const persistence = memoryPersistence();
    persistence.saveCalendar = async () => {
      /* swallow */
    };

    await expect(
      persistFinishedWorkout(
        startProgram("2026-08-24"),
        {},
        "2026-08-24",
        "push",
        CYCLE.length,
        persistence,
      ),
    ).rejects.toThrow(/calendar completed/);
    expect(persistence.sessionCleared).toBe(false);
    expect(persistence.cycleMem.size).toBe(0);
    expect((await persistence.loadCycle())?.pointerIndex).toBeUndefined();
  });

  it("refuses a recovery date before any cycle write — the real finish path, not mark-done", async () => {
    const persistence = memoryPersistence();
    const cycle = startProgram("2026-08-24");
    const calendar = markRecoveryOnCalendar({}, "2026-08-24");
    await persistence.saveCycle(cycle);
    await persistence.saveCalendar(calendar);

    await expect(
      persistFinishedWorkout(
        cycle,
        calendar,
        "2026-08-24",
        "push",
        CYCLE.length,
        persistence,
      ),
    ).rejects.toThrow(/already settled/);

    expect(persistence.sessionCleared).toBe(false);
    expect((await persistence.loadCalendar())["2026-08-24"]?.status).toBe(
      "recovery",
    );
    expect((await persistence.loadCycle())?.pointerIndex).toBe(0);
    expect((await persistence.loadCycle())?.lastCompletedDate).toBeNull();
  });
});

describe("persistFinishedWorkout across a full cycle hop including Rest", () => {
  it("advances Push → Pull → Legs, auto-advances Rest at midnight, then finishes Upper", async () => {
    const persistence = memoryPersistence();
    let cycle = startProgram("2026-08-24");
    let calendar: Record<string, CalendarEntry> = {};

    const push = await persistFinishedWorkout(
      cycle,
      calendar,
      "2026-08-24",
      "push",
      CYCLE.length,
      persistence,
    );
    cycle = push.cycle;
    calendar = push.calendar;
    expect(cycle.pointerIndex).toBe(1);
    expect(CYCLE[cycle.pointerIndex]).toBe("pull");
    expect(calendar["2026-08-24"]).toEqual({
      status: "completed",
      dayKey: "push",
    });

    const tue = evaluateCycle(cycle, "2026-08-25", CYCLE);
    expect(tue.writes).toEqual([]);
    expect(tue.state.pointerIndex).toBe(1);
    cycle = tue.state;

    const pull = await persistFinishedWorkout(
      cycle,
      calendar,
      "2026-08-25",
      "pull",
      CYCLE.length,
      persistence,
    );
    cycle = pull.cycle;
    calendar = pull.calendar;
    expect(CYCLE[cycle.pointerIndex]).toBe("legs");
    expect(calendar["2026-08-25"]).toEqual({
      status: "completed",
      dayKey: "pull",
    });

    const wed = evaluateCycle(cycle, "2026-08-26", CYCLE);
    expect(wed.state.pointerIndex).toBe(2);
    cycle = wed.state;

    const legs = await persistFinishedWorkout(
      cycle,
      calendar,
      "2026-08-26",
      "legs",
      CYCLE.length,
      persistence,
    );
    cycle = legs.cycle;
    calendar = legs.calendar;
    expect(CYCLE[cycle.pointerIndex]).toBe("rest");
    expect(cycle.pendingSince).toBe("2026-08-27");
    expect(calendar["2026-08-26"]).toEqual({
      status: "completed",
      dayKey: "legs",
    });

    const thu = evaluateCycle(cycle, "2026-08-27", CYCLE);
    expect(thu.writes).toEqual([]);
    expect(thu.state.pointerIndex).toBe(3);
    expect(CYCLE[thu.state.pointerIndex]).toBe("rest");
    expect(thu.state.pendingSince).toBe("2026-08-27");
    cycle = thu.state;

    const fri = evaluateCycle(cycle, "2026-08-28", CYCLE);
    expect(fri.writes).toEqual([
      { date: "2026-08-27", entry: { status: "rest", dayKey: "rest" } },
    ]);
    expect(fri.state.pointerIndex).toBe(4);
    expect(CYCLE[fri.state.pointerIndex]).toBe("upper");
    calendar = { ...calendar };
    for (const w of fri.writes) {
      calendar = mergeCalendarWrite(calendar, w.date, w.entry);
    }
    expect(calendar["2026-08-26"]?.status).toBe("completed");
    expect(calendar["2026-08-27"]).toEqual({ status: "rest", dayKey: "rest" });
    cycle = fri.state;

    const upper = await persistFinishedWorkout(
      cycle,
      calendar,
      "2026-08-28",
      "upper",
      CYCLE.length,
      persistence,
    );
    expect(CYCLE[upper.cycle.pointerIndex]).toBe("lower");
    expect(upper.calendar["2026-08-28"]).toEqual({
      status: "completed",
      dayKey: "upper",
    });
    expect(upper.calendar["2026-08-24"]?.dayKey).toBe("push");
    expect(upper.calendar["2026-08-25"]?.dayKey).toBe("pull");
    expect(upper.calendar["2026-08-26"]?.dayKey).toBe("legs");
  });
});

describe("persistFinishedWorkout on a picked-up missed day", () => {
  it("logs Wednesday as the pending Pull, keeps Monday missed, Tuesday blank, and clears pickup", async () => {
    const persistence = memoryPersistence();
    let cycle: CycleState = {
      ...startProgram("2026-08-24"),
      pointerIndex: 1,
      pendingSince: "2026-08-24",
      lastEvaluatedDate: "2026-08-24",
    };
    let calendar: Record<string, CalendarEntry> = {};

    const wed = evaluateCycle(cycle, "2026-08-26", CYCLE);
    expect(wed.writes).toEqual([
      { date: "2026-08-24", entry: { status: "missed", dayKey: "pull" } },
    ]);
    expect(wed.state.pointerIndex).toBe(1);
    expect(wed.state.pendingSince).toBe("2026-08-24");
    expect(isMissedPickup(wed.state, "2026-08-26", "pull")).toBe(true);
    cycle = wed.state;
    for (const w of wed.writes) {
      calendar = mergeCalendarWrite(calendar, w.date, w.entry);
    }

    const stored = await persistFinishedWorkout(
      cycle,
      calendar,
      "2026-08-26",
      "pull",
      CYCLE.length,
      persistence,
    );

    expect(stored.calendar["2026-08-24"]).toEqual({
      status: "missed",
      dayKey: "pull",
    });
    expect(stored.calendar["2026-08-25"]).toBeUndefined();
    expect(stored.calendar["2026-08-26"]).toEqual({
      status: "completed",
      dayKey: "pull",
    });
    expect(stored.cycle.pointerIndex).toBe(2);
    expect(CYCLE[stored.cycle.pointerIndex]).toBe("legs");
    expect(stored.cycle.pendingSince).toBe("2026-08-27");
    expect(stored.cycle.lastCompletedDate).toBe("2026-08-26");
    expect(isMissedPickup(stored.cycle, "2026-08-26", "pull")).toBe(false);
    expect(isMissedPickup(stored.cycle, "2026-08-26", "legs")).toBe(false);
  });
});
