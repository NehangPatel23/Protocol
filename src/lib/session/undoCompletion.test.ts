import { describe, expect, it } from "vitest";
import type { SessionRecord } from "@/lib/db/cardio";
import type { StoreWrite } from "@/lib/db/index";
import {
  applyUndoCompletion,
  buildCompletionRevert,
  canUndoCompletion,
  completeTrainingDay,
  evaluateCycle,
  startProgram,
  withCompletionRevert,
  type CalendarEntry,
  type CycleState,
} from "@/lib/program/cycle";
import type { DayKey } from "@/lib/program/types";
import { persistFinishedWorkout } from "./finishWorkout";
import {
  persistUndoCompletion,
  sessionAfterUndoCompletion,
} from "./undoCompletion";

const CYCLE: DayKey[] = [
  "push",
  "pull",
  "legs",
  "rest",
  "upper",
  "lower",
  "rest",
];

function memoryPersistence(options?: { failMidway?: boolean }): {
  cycleMem: Map<string, CycleState>;
  calMem: Map<string, Record<string, CalendarEntry>>;
  sessionMem: Map<string, SessionRecord>;
  loadCycle: () => Promise<CycleState | undefined>;
  loadCalendar: () => Promise<Record<string, CalendarEntry>>;
  loadSession: (date: string) => Promise<SessionRecord | undefined>;
  commitWrites: (writes: StoreWrite[]) => Promise<void>;
} {
  const cycleMem = new Map<string, CycleState>();
  const calMem = new Map<string, Record<string, CalendarEntry>>();
  const sessionMem = new Map<string, SessionRecord>();
  return {
    cycleMem,
    calMem,
    sessionMem,
    loadCycle: async () => cycleMem.get("state"),
    loadCalendar: async () => calMem.get("days") ?? {},
    loadSession: async (date: string) => sessionMem.get(date),
    commitWrites: async (writes: StoreWrite[]) => {
      if (options?.failMidway) {
        // Simulate a mid-transaction abort: apply nothing.
        throw new Error("simulated mid-write failure");
      }
      const nextCycle = new Map(cycleMem);
      const nextCal = new Map(calMem);
      const nextSession = new Map(sessionMem);
      for (const write of writes) {
        if (write.op === "put") {
          if (write.store === "cycle") {
            nextCycle.set(write.key, write.value as CycleState);
          } else if (write.store === "calendar") {
            nextCal.set(
              write.key,
              write.value as Record<string, CalendarEntry>,
            );
          } else if (write.store === "sessions") {
            nextSession.set(write.key, write.value as SessionRecord);
          }
        } else if (write.store === "sessions") {
          nextSession.delete(write.key);
        }
      }
      cycleMem.clear();
      for (const [k, v] of nextCycle) cycleMem.set(k, v);
      calMem.clear();
      for (const [k, v] of nextCal) calMem.set(k, v);
      sessionMem.clear();
      for (const [k, v] of nextSession) sessionMem.set(k, v);
    },
  };
}

describe("applyUndoCompletion restore correctness", () => {
  it("restores every cycle field from the snapshot including lastEvaluatedDate", () => {
    const before = {
      ...startProgram("2026-08-24"),
      pointerIndex: 0,
      lastCompletedDate: "2026-08-20" as string | null,
      lastEvaluatedDate: "2026-08-23",
      pendingSince: "2026-08-24",
      outOfSequenceFrom: "2026-08-22" as string | null,
    };
    const revert = buildCompletionRevert(before, "2026-08-24", "push", true);
    const finished = withCompletionRevert(
      completeTrainingDay(before, "2026-08-24", CYCLE.length),
      revert,
    );
    const calendar: Record<string, CalendarEntry> = {
      "2026-08-24": { status: "completed", dayKey: "push" },
    };
    const undone = applyUndoCompletion(finished, calendar, "2026-08-24");

    expect(undone.cycle.pointerIndex).toBe(before.pointerIndex);
    expect(undone.cycle.lastCompletedDate).toBe(before.lastCompletedDate);
    expect(undone.cycle.lastEvaluatedDate).toBe(before.lastEvaluatedDate);
    expect(undone.cycle.pendingSince).toBe(before.pendingSince);
    expect(undone.cycle.outOfSequenceFrom).toBe(before.outOfSequenceFrom);
    expect(undone.cycle.completionRevert).toBeNull();
    expect(undone.calendar["2026-08-24"]).toBeUndefined();
    expect(undone.revert).toEqual(revert);
  });
});

describe("canUndoCompletion visibility", () => {
  it("requires completed calendar, lastCompletedDate === today, and today's snapshot", () => {
    const today = "2026-08-24";
    const before = startProgram(today);
    const revert = buildCompletionRevert(before, today, "push", false);
    const cycle = withCompletionRevert(
      completeTrainingDay(before, today, CYCLE.length),
      revert,
    );
    const calendar: Record<string, CalendarEntry> = {
      [today]: { status: "completed", dayKey: "push" },
    };
    expect(canUndoCompletion(cycle, calendar, today)).toBe(true);
    expect(canUndoCompletion(cycle, {}, today)).toBe(false);
    expect(
      canUndoCompletion(
        { ...cycle, lastCompletedDate: "2026-08-23" },
        calendar,
        today,
      ),
    ).toBe(false);
    expect(
      canUndoCompletion(
        { ...cycle, completionRevert: null },
        calendar,
        today,
      ),
    ).toBe(false);
    expect(
      canUndoCompletion(
        {
          ...cycle,
          completionRevert: { ...revert, date: "2026-08-23" },
        },
        calendar,
        today,
      ),
    ).toBe(false);
  });

  it("never allows undo on a recovery day", () => {
    const today = "2026-08-24";
    const before = startProgram(today);
    const revert = buildCompletionRevert(before, today, "push", false);
    const cycle = withCompletionRevert(
      { ...before, lastCompletedDate: today, completionRevert: revert },
      revert,
    );
    expect(
      canUndoCompletion(
        cycle,
        { [today]: { status: "recovery", dayKey: "rest" } },
        today,
      ),
    ).toBe(false);
  });
});

describe("stale completionRevert cleanup", () => {
  it("evaluateCycle clears yesterday's snapshot when today advances", () => {
    const before = startProgram("2026-08-24");
    const revert = buildCompletionRevert(before, "2026-08-24", "push", false);
    const finished = withCompletionRevert(
      completeTrainingDay(before, "2026-08-24", CYCLE.length),
      revert,
    );
    const next = evaluateCycle(finished, "2026-08-25", CYCLE);
    expect(next.state.completionRevert).toBeNull();
    expect(next.state.lastEvaluatedDate).toBe("2026-08-25");
  });
});

describe("sessionAfterUndoCompletion", () => {
  it("deletes finish-only metadata and clears timestamps when substance remains", () => {
    expect(
      sessionAfterUndoCompletion(
        {
          date: "2026-08-24",
          dayKey: "push",
          type: "program",
          entries: [],
          cardio: null,
          complete: true,
          startedAt: "a",
          finishedAt: "b",
        },
        "2026-08-24",
        "push",
        false,
      ),
    ).toBe("delete");

    const kept = sessionAfterUndoCompletion(
      {
        date: "2026-08-24",
        dayKey: "push",
        type: "program",
        entries: [],
        cardio: {
          activity: "walk",
          durationMin: 20,
          distance: null,
          distanceUnit: "mi",
          inclinePct: null,
          speed: null,
          speedUnit: "mph",
          resistanceLevel: null,
          avgHrBpm: null,
          notes: null,
          loggedAt: "2026-08-24T12:00:00.000Z",
        },
        complete: true,
        startedAt: "a",
        finishedAt: "b",
        outOfSequenceBanner: true,
        durationMin: 20,
      },
      "2026-08-24",
      "push",
      false,
    );
    expect(kept).not.toBe("delete");
    expect(kept).not.toBe("noop");
    if (typeof kept === "object") {
      expect(kept.complete).toBe(false);
      expect(kept.startedAt).toBeUndefined();
      expect(kept.finishedAt).toBeUndefined();
      expect(kept.outOfSequenceBanner).toBeUndefined();
      expect(kept.cardio).toBeTruthy();
    }
  });
});

describe("persistUndoCompletion atomicity", () => {
  it("round-trips finish then undo restoring all snapshot fields", async () => {
    const persistence = memoryPersistence();
    const started = startProgram("2026-08-24");
    const finished = await persistFinishedWorkout(
      started,
      {},
      "2026-08-24",
      "push",
      CYCLE.length,
      persistence,
      null,
      {
        startedAt: "2026-08-24T18:00:00.000Z",
        finishedAt: "2026-08-24T19:00:00.000Z",
      },
    );

    const undone = await persistUndoCompletion(
      finished.cycle,
      finished.calendar,
      "2026-08-24",
      persistence,
    );

    expect(undone.calendar["2026-08-24"]).toBeUndefined();
    expect(undone.cycle.pointerIndex).toBe(started.pointerIndex);
    expect(undone.cycle.lastCompletedDate).toBe(started.lastCompletedDate);
    expect(undone.cycle.lastEvaluatedDate).toBe(started.lastEvaluatedDate);
    expect(undone.cycle.pendingSince).toBe(started.pendingSince);
    expect(undone.cycle.outOfSequenceFrom ?? null).toBe(
      started.outOfSequenceFrom ?? null,
    );
    expect(undone.cycle.completionRevert).toBeNull();
    expect(persistence.sessionMem.has("2026-08-24")).toBe(false);
  });

  it("leaves all stores unchanged when the transaction fails midway", async () => {
    const ok = memoryPersistence();
    const started = startProgram("2026-08-24");
    const finished = await persistFinishedWorkout(
      started,
      {},
      "2026-08-24",
      "push",
      CYCLE.length,
      ok,
    );
    const cycleBefore = structuredClone(finished.cycle);
    const calBefore = structuredClone(finished.calendar);
    const sessionBefore = structuredClone(
      ok.sessionMem.get("2026-08-24"),
    );

    const failing = {
      ...ok,
      commitWrites: async () => {
        throw new Error("simulated mid-write failure");
      },
    };

    await expect(
      persistUndoCompletion(
        finished.cycle,
        finished.calendar,
        "2026-08-24",
        failing,
      ),
    ).rejects.toThrow(/simulated mid-write failure/);

    expect(await ok.loadCycle()).toEqual(cycleBefore);
    expect(await ok.loadCalendar()).toEqual(calBefore);
    expect(ok.sessionMem.get("2026-08-24")).toEqual(sessionBefore);
  });

  it("refuses a stale snapshot even if lastCompletedDate still matches", async () => {
    const persistence = memoryPersistence();
    const started = startProgram("2026-08-24");
    const finished = await persistFinishedWorkout(
      started,
      {},
      "2026-08-24",
      "push",
      CYCLE.length,
      persistence,
    );
    const stale = {
      ...finished.cycle,
      completionRevert: {
        ...finished.cycle.completionRevert!,
        date: "2026-08-23",
      },
    };
    await expect(
      persistUndoCompletion(stale, finished.calendar, "2026-08-24", persistence),
    ).rejects.toThrow(/refused/);
  });

  it("out-of-sequence undo restores outOfSequenceFrom and clears the banner", async () => {
    const persistence = memoryPersistence();
    const pendingDate = "2026-08-24";
    const logDate = "2026-08-26";
    const started = {
      ...startProgram(pendingDate),
      outOfSequenceFrom: pendingDate,
      pendingSince: logDate,
      lastEvaluatedDate: logDate,
      pointerIndex: 2,
    };
    const finished = await persistFinishedWorkout(
      started,
      {},
      logDate,
      "legs",
      CYCLE.length,
      persistence,
      pendingDate,
    );
    expect(finished.cycle.outOfSequenceFrom).toBeNull();
    expect(persistence.sessionMem.get(logDate)?.outOfSequenceBanner).toBe(true);

    // Give the session substance so undo updates rather than deletes.
    persistence.sessionMem.set(logDate, {
      ...persistence.sessionMem.get(logDate)!,
      cardio: {
        activity: "walk",
        durationMin: 10,
        distance: null,
        distanceUnit: "mi",
        inclinePct: null,
        speed: null,
        speedUnit: "mph",
        resistanceLevel: null,
        avgHrBpm: null,
        notes: null,
        loggedAt: "2026-08-26T12:00:00.000Z",
      },
      durationMin: 10,
    });

    const undone = await persistUndoCompletion(
      finished.cycle,
      finished.calendar,
      logDate,
      persistence,
    );
    expect(undone.cycle.outOfSequenceFrom).toBe(pendingDate);
    expect(undone.cycle.pointerIndex).toBe(2);
    expect(undone.calendar[logDate]).toBeUndefined();
    expect(persistence.sessionMem.get(logDate)?.outOfSequenceBanner).toBeUndefined();
    expect(persistence.sessionMem.get(logDate)?.complete).toBe(false);
  });
});
