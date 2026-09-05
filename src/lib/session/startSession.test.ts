import { describe, expect, it, vi } from "vitest";
import { markRecoveryOnCalendar } from "@/lib/db/cycle";
import type { ActiveSessionState } from "@/lib/db/activeSession";
import { coalesceInflight, persistStartedSession } from "./startSession";

function memorySession() {
  const mem = new Map<string, ActiveSessionState>();
  return {
    mem,
    save: async (state: ActiveSessionState) => {
      mem.set("current", { ...state });
    },
    load: async () => mem.get("current"),
  };
}

describe("coalesceInflight", () => {
  it("second caller awaits the first create instead of starting a second session", async () => {
    const run = coalesceInflight<string>();
    let creates = 0;
    let release: () => void = () => {};
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = run(async () => {
      creates += 1;
      await blocked;
      return "s1";
    });
    const second = run(async () => {
      creates += 1;
      return "s2";
    });

    release();
    expect(await first).toBe("s1");
    expect(await second).toBe("s1");
    expect(creates).toBe(1);
  });
});

describe("persistStartedSession", () => {
  it("returns the existing session and does not write a second one", async () => {
    const persistence = memorySession();
    const existing: ActiveSessionState = {
      date: "2026-09-01",
      dayKey: "push",
      currentStep: 2,
      startedAt: "2026-09-01T18:00:00.000Z",
      restEndsAt: null,
      restDurationSec: null,
    };
    await persistence.save(existing);

    const save = vi.fn(persistence.save);
    const stored = await persistStartedSession(
      {
        existing,
        date: "2026-09-01",
        dayKey: "push",
        calendar: {},
        programStarted: true,
      },
      { save, load: persistence.load },
    );

    expect(stored.currentStep).toBe(2);
    expect(save).not.toHaveBeenCalled();
  });

  it("loads a stored session when React state is empty, rather than creating a new one", async () => {
    const persistence = memorySession();
    const existing: ActiveSessionState = {
      date: "2026-09-01",
      dayKey: "pull",
      currentStep: 3,
      startedAt: "2026-09-01T18:00:00.000Z",
      restEndsAt: null,
      restDurationSec: null,
    };
    await persistence.save(existing);

    const stored = await persistStartedSession(
      {
        existing: null,
        date: "2026-09-01",
        dayKey: "pull",
        calendar: {},
        programStarted: true,
      },
      persistence,
    );
    expect(stored.currentStep).toBe(3);
    expect(stored.dayKey).toBe("pull");
  });

  it("two overlapping creates through coalesceInflight persist a single session", async () => {
    const persistence = memorySession();
    const run = coalesceInflight<ActiveSessionState>();
    const start = () =>
      run(() =>
        persistStartedSession(
          {
            existing: null,
            date: "2026-09-01",
            dayKey: "push",
            calendar: {},
            programStarted: true,
          },
          persistence,
        ),
      );

    const [a, b] = await Promise.all([start(), start()]);
    expect(a).toEqual(b);
    expect(persistence.mem.size).toBe(1);
    expect(a.currentStep).toBe(0);
    expect(a.dayKey).toBe("push");
  });

  it("refuses to start on a recovery day", async () => {
    const persistence = memorySession();
    await expect(
      persistStartedSession(
        {
          existing: null,
          date: "2026-09-01",
          dayKey: "push",
          calendar: markRecoveryOnCalendar({}, "2026-09-01"),
          programStarted: true,
        },
        persistence,
      ),
    ).rejects.toThrow(/revert recovery/);
    expect(persistence.mem.size).toBe(0);
  });
});
