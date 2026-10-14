import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreWrite } from "@/lib/db/index";
import { DEFAULT_PREFS, type StoreName } from "@/lib/db/schema";
import type { SessionRecord } from "@/lib/db/cardio";
import type { HistoryEntry } from "@/lib/db/history";
import { initialCycleState, type CalendarEntry, type CycleState } from "@/lib/program/cycle";
import { buildProgramFromSeed } from "@/lib/program/seed";
import { decideActiveSessionRestore } from "./activeSession";
import { assertCycleCalendarConsistent } from "./consistency";
import { shareOrDownloadBackup } from "./download";
import { DEVICE_NOT_EMPTY_MESSAGE, isDeviceEmpty } from "./empty";
import {
  APP_VERSION,
  backupFilename,
  serializeBackup,
} from "./export";
import {
  buildRestoreWrites,
  planRestore,
  restoreBackup,
  type DeviceSnapshot,
} from "./import";
import { isSeedOnlyProgram } from "./programDiff";
import { computeReconciledDerived } from "./reconcile";
import {
  BACKUP_SCHEMA_VERSION,
  BackupError,
  type BackupFileV1,
} from "./types";
import { parseBackupJson, validateBackupFile } from "./validate";

const TODAY = "2026-10-13";

function emptyDevice(): DeviceSnapshot {
  return {
    calendar: {},
    sessions: {},
    exerciseHistory: {},
    cycle: initialCycleState(TODAY),
  };
}

function sampleBackup(overrides?: {
  data?: Partial<BackupFileV1["data"]>;
  schemaVersion?: number;
}): BackupFileV1 {
  const cycle: CycleState = {
    ...initialCycleState("2026-10-01"),
    started: true,
    pointerIndex: 1,
    lastCompletedDate: "2026-10-10",
    pendingSince: "2026-10-11",
    lastEvaluatedDate: "2026-10-13",
  };
  const calendar: Record<string, CalendarEntry> = {
    "2026-10-10": { status: "completed", dayKey: "push" },
    "2026-10-11": { status: "missed", dayKey: "pull" },
  };
  const sessions: Record<string, SessionRecord> = {
    "2026-10-10": {
      date: "2026-10-10",
      dayKey: "push",
      type: "program",
      entries: [],
      cardio: null,
      complete: true,
      startedAt: "2026-10-10T18:00:00.000Z",
      finishedAt: "2026-10-10T19:00:00.000Z",
    },
  };
  const exerciseHistory: Record<string, HistoryEntry[]> = {
    "bench-press": [
      {
        date: "2026-10-10",
        dayKey: "push",
        sets: [
          {
            id: "s1",
            weightKg: 80,
            reps: 5,
            loggedAt: "2026-10-10T18:10:00.000Z",
          },
        ],
      },
    ],
  };

  return {
    schemaVersion: overrides?.schemaVersion ?? BACKUP_SCHEMA_VERSION,
    exportedAt: "2026-10-13T12:00:00.000Z",
    appVersion: APP_VERSION,
    data: {
      prefs: { ...DEFAULT_PREFS, units: "kg" },
      cycle,
      calendar,
      sessions,
      exerciseHistory,
      notes: { "bench-press": "elbows in" },
      soreness: {},
      ...overrides?.data,
    },
  } as BackupFileV1;
}

function memoryStore() {
  const bags = new Map<StoreName, Map<string, unknown>>();
  function bag(store: StoreName) {
    let m = bags.get(store);
    if (!m) {
      m = new Map();
      bags.set(store, m);
    }
    return m;
  }
  return {
    bags,
    commit(stores: StoreName[], writes: StoreWrite[]) {
      // All-or-nothing: stage then apply.
      const staged = [...writes];
      for (const w of staged) {
        if (!stores.includes(w.store)) {
          throw new Error(`store ${w.store} not in transaction`);
        }
      }
      for (const w of staged) {
        if (w.op === "put") bag(w.store).set(w.key, w.value);
        else bag(w.store).delete(w.key);
      }
    },
    snapshot(): Record<string, Record<string, unknown>> {
      const out: Record<string, Record<string, unknown>> = {};
      for (const [store, m] of bags) {
        out[store] = Object.fromEntries(m);
      }
      return out;
    },
    readStore(store: StoreName) {
      return Object.fromEntries(bag(store));
    },
  };
}

describe("isDeviceEmpty", () => {
  it("treats default first-boot state as empty", () => {
    expect(isDeviceEmpty(emptyDevice())).toBe(true);
    expect(
      isDeviceEmpty({
        calendar: {},
        sessions: {},
        exerciseHistory: {},
        cycle: undefined,
      }),
    ).toBe(true);
  });

  it("refuses when calendar has days", () => {
    expect(
      isDeviceEmpty({
        ...emptyDevice(),
        calendar: { [TODAY]: { status: "blank" } },
      }),
    ).toBe(false);
  });

  it("refuses when sessions exist", () => {
    expect(
      isDeviceEmpty({
        ...emptyDevice(),
        sessions: {
          [TODAY]: {
            date: TODAY,
            dayKey: "push",
            type: "program",
            entries: [],
            cardio: null,
            complete: false,
          },
        },
      }),
    ).toBe(false);
  });

  it("refuses when exerciseHistory has entries", () => {
    expect(
      isDeviceEmpty({
        ...emptyDevice(),
        exerciseHistory: {
          x: [{ date: TODAY, sets: [] }],
        },
      }),
    ).toBe(false);
  });

  it("refuses when cycle.started is true", () => {
    expect(
      isDeviceEmpty({
        ...emptyDevice(),
        cycle: { ...initialCycleState(TODAY), started: true },
      }),
    ).toBe(false);
  });

  it("refuses when cycle.started is undefined (legacy in-use)", () => {
    const cycle = initialCycleState(TODAY);
    delete cycle.started;
    expect(isDeviceEmpty({ ...emptyDevice(), cycle })).toBe(false);
  });
});

describe("validateBackupFile", () => {
  it("accepts a well-formed v1 backup", () => {
    const backup = sampleBackup();
    expect(validateBackupFile(backup).schemaVersion).toBe(1);
  });

  it("rejects malformed JSON via parseBackupJson", () => {
    expect(() => parseBackupJson("{")).toThrow(BackupError);
  });

  it("rejects wrong shape", () => {
    expect(() => validateBackupFile(null)).toThrow(/wrong shape/i);
    expect(() =>
      validateBackupFile({
        schemaVersion: 1,
        exportedAt: "2026-10-13T00:00:00.000Z",
        appVersion: "0.1.0",
      }),
    ).toThrow(/data/i);
  });

  it("rejects newer schemaVersion", () => {
    expect(() => validateBackupFile(sampleBackup({ schemaVersion: 99 }))).toThrow(
      /newer version/i,
    );
  });

  it("rejects inconsistent cycle/calendar", () => {
    expect(() =>
      validateBackupFile(
        sampleBackup({
          data: {
            cycle: {
              ...initialCycleState(TODAY),
              started: true,
              lastCompletedDate: "2026-10-01",
            },
            calendar: {
              "2026-10-10": { status: "completed", dayKey: "push" },
            },
          },
        }),
      ),
    ).toThrow(/inconsistent/i);
  });

  it("leaves storage untouched when validation fails", async () => {
    const mem = memoryStore();
    let derivedCalls = 0;
    await expect(
      restoreBackup("not-json", {
        loadDeviceSnapshot: async () => emptyDevice(),
        commitWrites: async (stores, writes) => mem.commit(stores, writes),
        persistDerived: async () => {
          derivedCalls += 1;
        },
        today: TODAY,
      }),
    ).rejects.toThrow(BackupError);
    expect(mem.snapshot()).toEqual({});
    expect(derivedCalls).toBe(0);
  });
});

describe("export contents", () => {
  it("filename uses protocol-backup-YYYY-MM-DD.json", () => {
    expect(backupFilename("2026-10-13")).toBe(
      "protocol-backup-2026-10-13.json",
    );
  });

  it("serialized export contains no prs or badges", () => {
    const json = serializeBackup(sampleBackup());
    const parsed = JSON.parse(json) as BackupFileV1 & {
      data: { prs?: unknown; badges?: unknown };
    };
    expect(parsed.data.prs).toBeUndefined();
    expect(parsed.data.badges).toBeUndefined();
    expect(json).not.toMatch(/"prs"/);
    expect(json).not.toMatch(/"badges"/);
  });

  it("detects seed-only vs edited program", () => {
    expect(isSeedOnlyProgram(buildProgramFromSeed())).toBe(true);
    const edited = buildProgramFromSeed();
    const firstId = Object.keys(edited.exercises)[0];
    edited.exercises[firstId] = {
      ...edited.exercises[firstId],
      name: "Renamed Lift",
    };
    expect(isSeedOnlyProgram(edited)).toBe(false);
  });
});

describe("activeSession restore decision", () => {
  const session = {
    date: TODAY,
    dayKey: "push" as const,
    currentStep: 0,
    startedAt: `${TODAY}T12:00:00.000Z`,
    restEndsAt: null,
    restDurationSec: null,
  };

  it("restores when session is for today and calendar today is not completed", () => {
    expect(
      decideActiveSessionRestore(session, {}, TODAY).action,
    ).toBe("restore");
  });

  it("discards when session date is not today", () => {
    const d = decideActiveSessionRestore(
      { ...session, date: "2026-10-12" },
      {},
      TODAY,
    );
    expect(d.action).toBe("discard");
    expect(d.reason).toMatch(/not today/);
  });

  it("discards when calendar[today] is completed", () => {
    const d = decideActiveSessionRestore(
      session,
      { [TODAY]: { status: "completed", dayKey: "push" } },
      TODAY,
    );
    expect(d.action).toBe("discard");
    expect(d.reason).toMatch(/completed/);
  });
});

describe("restore into empty", () => {
  it("refuses when the device has data", () => {
    const backup = sampleBackup();
    expect(() =>
      planRestore(JSON.stringify(backup), {
        ...emptyDevice(),
        calendar: { [TODAY]: { status: "missed", dayKey: "push" } },
      }),
    ).toThrow(DEVICE_NOT_EMPTY_MESSAGE);
  });

  it("round-trips user stores (ignoring derived)", async () => {
    const backup = sampleBackup({
      data: {
        activeSession: {
          date: TODAY,
          dayKey: "legs",
          currentStep: 2,
          startedAt: `${TODAY}T10:00:00.000Z`,
          restEndsAt: null,
          restDurationSec: null,
        },
      },
    });
    // Ensure cycle/calendar consistent with lastCompletedDate
    assertCycleCalendarConsistent(backup.data.cycle, backup.data.calendar);

    const mem = memoryStore();
    const derived: { prs: unknown; badges: unknown } = { prs: null, badges: null };

    await restoreBackup(JSON.stringify(backup), {
      loadDeviceSnapshot: async () => emptyDevice(),
      commitWrites: async (stores, writes) => mem.commit(stores, writes),
      persistDerived: async (result) => {
        derived.prs = result.prs;
        derived.badges = result.badges;
      },
      today: TODAY,
    });

    expect(mem.readStore("prefs").user).toEqual(backup.data.prefs);
    expect(mem.readStore("cycle").state).toEqual(backup.data.cycle);
    expect(mem.readStore("calendar").days).toEqual(backup.data.calendar);
    expect(mem.readStore("sessions")).toEqual(backup.data.sessions);
    expect(mem.readStore("exerciseHistory")).toEqual(
      backup.data.exerciseHistory,
    );
    expect(mem.readStore("notes")).toEqual(backup.data.notes);
    expect(mem.readStore("soreness").days).toEqual(backup.data.soreness);
    expect(mem.readStore("activeSession").current).toEqual(
      backup.data.activeSession,
    );
    // program was seed-only → re-seeded
    expect(mem.readStore("program").exercises).toEqual(
      buildProgramFromSeed().exercises,
    );
    // derived recomputed, not imported
    expect(mem.readStore("prs")).toEqual({});
    expect(derived.prs).toBeTruthy();
  });

  it("discards stale activeSession in writes", () => {
    const backup = sampleBackup({
      data: {
        activeSession: {
          date: "2026-10-01",
          dayKey: "push",
          currentStep: 0,
          startedAt: "2026-10-01T10:00:00.000Z",
          restEndsAt: null,
          restDurationSec: null,
        },
      },
    });
    const writes = buildRestoreWrites(backup, TODAY);
    expect(writes.some((w) => w.store === "activeSession")).toBe(false);
  });

  it("is atomic — a failed commit leaves storage untouched", async () => {
    const mem = memoryStore();
    let calls = 0;
    await expect(
      restoreBackup(JSON.stringify(sampleBackup()), {
        loadDeviceSnapshot: async () => emptyDevice(),
        commitWrites: async () => {
          calls += 1;
          throw new Error("disk full");
        },
        persistDerived: async () => {
          mem.commit(["prs"], [
            {
              op: "put",
              store: "prs",
              key: "x",
              value: { weightKg: 1, reps: 1, date: TODAY, est1RM: 1 },
            },
          ]);
        },
        today: TODAY,
      }),
    ).rejects.toThrow(/disk full/);
    expect(calls).toBe(1);
    expect(mem.snapshot()).toEqual({});
  });

  it("rejected imports (not empty) leave storage untouched", async () => {
    const mem = memoryStore();
    await expect(
      restoreBackup(JSON.stringify(sampleBackup()), {
        loadDeviceSnapshot: async () => ({
          ...emptyDevice(),
          sessions: {
            [TODAY]: {
              date: TODAY,
              dayKey: "push",
              type: "program",
              entries: [],
              cardio: null,
              complete: false,
            },
          },
        }),
        commitWrites: async (stores, writes) => mem.commit(stores, writes),
        today: TODAY,
      }),
    ).rejects.toThrow(DEVICE_NOT_EMPTY_MESSAGE);
    expect(mem.snapshot()).toEqual({});
  });
});

describe("reconcile after import", () => {
  it("does not create a PR from a 0 lb external set", () => {
    const program = buildProgramFromSeed();
    const externalId =
      Object.values(program.exercises).find((e) => e.loadType === "external")
        ?.id ?? Object.keys(program.exercises)[0];
    // Ensure loadType is external for the guard
    program.exercises[externalId] = {
      ...program.exercises[externalId],
      loadType: "external",
      prType: "weight",
    };

    const history = {
      [externalId]: [
        {
          date: TODAY,
          sets: [
            {
              id: "z",
              weightKg: 0,
              reps: 8,
              loggedAt: `${TODAY}T12:00:00.000Z`,
            },
          ],
        },
      ],
    };
    const result = computeReconciledDerived(history, {}, program, TODAY);
    expect(result.prs[externalId]).toBeUndefined();
  });
});

describe("shareOrDownloadBackup", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses navigator.share with a File on iOS when allowed", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const download = vi.fn();
    const delivery = await shareOrDownloadBackup("{}", "protocol-backup-2026-10-13.json", {
      isIos: true,
      share,
      canShare: () => true,
      download,
    });
    expect(delivery).toBe("share");
    expect(share).toHaveBeenCalledOnce();
    const arg = share.mock.calls[0][0] as ShareData;
    expect(arg.files?.[0]).toBeInstanceOf(File);
    expect(arg.files?.[0].name).toBe("protocol-backup-2026-10-13.json");
    expect(download).not.toHaveBeenCalled();
  });

  it("falls back to download when share fails on iOS", async () => {
    const share = vi.fn().mockRejectedValue(new Error("share unavailable"));
    const download = vi.fn();
    const delivery = await shareOrDownloadBackup("{}", "x.json", {
      isIos: true,
      share,
      canShare: () => true,
      download,
    });
    expect(delivery).toBe("download");
    expect(download).toHaveBeenCalledOnce();
  });

  it("downloads directly on non-iOS", async () => {
    const share = vi.fn();
    const download = vi.fn();
    const delivery = await shareOrDownloadBackup("{}", "x.json", {
      isIos: false,
      share,
      download,
    });
    expect(delivery).toBe("download");
    expect(share).not.toHaveBeenCalled();
    expect(download).toHaveBeenCalledOnce();
  });
});

describe("assertCycleCalendarConsistent", () => {
  it("allows both null", () => {
    expect(() =>
      assertCycleCalendarConsistent(initialCycleState(TODAY), {}),
    ).not.toThrow();
  });
});
