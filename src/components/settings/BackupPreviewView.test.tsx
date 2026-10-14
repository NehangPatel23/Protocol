import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFS } from "@/lib/db/schema";
import { initialCycleState } from "@/lib/program/cycle";
import { buildProgramFromSeed } from "@/lib/program/seed";
import {
  APP_VERSION,
  BACKUP_SCHEMA_VERSION,
  parseBackupForView,
  type BackupFileV1,
} from "@/lib/backup";
import { formatVolumeDisplay } from "@/lib/history/sessionStats";
import { BackupPreviewView } from "./BackupPreviewView";

const TODAY = "2026-10-13";
const SESSION_DATE = "2026-10-10";
const EX_ID = "chest-press-machine";

const getDB = vi.hoisted(() => vi.fn());
const getStoreValue = vi.hoisted(() => vi.fn());
const setStoreValue = vi.hoisted(() => vi.fn());
const deleteStoreValue = vi.hoisted(() => vi.fn());
const runStoresTransaction = vi.hoisted(() => vi.fn());
const loadCalendar = vi.hoisted(() => vi.fn());
const loadAllHistory = vi.hoisted(() => vi.fn());
const loadAllSessions = vi.hoisted(() => vi.fn());
const loadAllBadges = vi.hoisted(() => vi.fn());
const persistBadges = vi.hoisted(() => vi.fn());
const deleteBadge = vi.hoisted(() => vi.fn());
const savePR = vi.hoisted(() => vi.fn());
const loadAllPRs = vi.hoisted(() => vi.fn());
const loadProgram = vi.hoisted(() => vi.fn());
const getPrefs = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/index", () => ({
  getDB,
  getStoreValue,
  setStoreValue,
  deleteStoreValue,
  runStoresTransaction,
  getPrefs,
  setPrefs: vi.fn(),
  mergePrefs: vi.fn(),
  checkPersistence: vi.fn(),
  resetDbConnection: vi.fn(),
}));

vi.mock("@/lib/db/cycle", () => ({
  loadCalendar,
  loadCycle: vi.fn(),
  saveCalendar: vi.fn(),
  saveCycle: vi.fn(),
  mergeCalendarWrite: vi.fn(),
  markRecoveryOnCalendar: vi.fn(),
  clearRecoveryDate: vi.fn(),
  markTrainingDayDone: vi.fn(),
}));

vi.mock("@/lib/db/history", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/history")>(
    "@/lib/db/history",
  );
  return {
    ...actual,
    loadAllHistory,
    saveExerciseHistory: vi.fn(),
  };
});

vi.mock("@/lib/db/sessions", () => ({
  loadAllSessions,
  loadSession: vi.fn(),
  saveSession: vi.fn(),
  upsertSessionCardio: vi.fn(),
}));

vi.mock("@/lib/db/badges", () => ({
  loadAllBadges,
  persistBadges,
  deleteBadge,
  saveBadge: vi.fn(),
}));

vi.mock("@/lib/db/prs", () => ({
  loadAllPRs,
  savePR,
  deletePR: vi.fn(),
}));

vi.mock("@/lib/db/program", () => ({
  loadProgram,
  persistProgram: vi.fn(),
  loadAllNotes: vi.fn(),
  saveNote: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  for (const fn of [
    getDB,
    getStoreValue,
    setStoreValue,
    deleteStoreValue,
    runStoresTransaction,
    loadCalendar,
    loadAllHistory,
    loadAllSessions,
    loadAllBadges,
    persistBadges,
    deleteBadge,
    savePR,
    loadAllPRs,
    loadProgram,
    getPrefs,
  ]) {
    fn.mockReset();
  }
});

function fixtureBackup(overrides?: {
  data?: Partial<BackupFileV1["data"]>;
  schemaVersion?: number;
}): BackupFileV1 {
  return {
    schemaVersion: (overrides?.schemaVersion ??
      BACKUP_SCHEMA_VERSION) as typeof BACKUP_SCHEMA_VERSION,
    exportedAt: "2026-10-13T12:00:00.000Z",
    appVersion: APP_VERSION,
    data: {
      prefs: { ...DEFAULT_PREFS, units: "kg" },
      cycle: {
        ...initialCycleState("2026-10-01"),
        started: true,
        pointerIndex: 1,
        lastCompletedDate: SESSION_DATE,
        pendingSince: "2026-10-11",
        lastEvaluatedDate: TODAY,
      },
      calendar: {
        [SESSION_DATE]: { status: "completed", dayKey: "push" },
      },
      sessions: {
        [SESSION_DATE]: {
          date: SESSION_DATE,
          dayKey: "push",
          type: "program",
          entries: [],
          cardio: null,
          complete: true,
          startedAt: `${SESSION_DATE}T18:00:00.000Z`,
          finishedAt: `${SESSION_DATE}T19:15:00.000Z`,
        },
      },
      exerciseHistory: {
        [EX_ID]: [
          {
            date: SESSION_DATE,
            dayKey: "push",
            sets: [
              {
                id: "s1",
                weightKg: 80,
                reps: 5,
                loggedAt: `${SESSION_DATE}T18:10:00.000Z`,
              },
            ],
          },
        ],
      },
      notes: {},
      soreness: {},
      ...overrides?.data,
    },
  };
}

describe("BackupPreviewView source isolation", () => {
  it("does not import or render HistoryScreen or ProgressScreen", () => {
    const srcPath = path.join(
      process.cwd(),
      "src/components/settings/BackupPreviewView.tsx",
    );
    const src = readFileSync(srcPath, "utf8");
    expect(src).not.toMatch(/from\s+["'][^"']*HistoryScreen["']/);
    expect(src).not.toMatch(/from\s+["'][^"']*ProgressScreen["']/);
    expect(src).not.toMatch(/<\s*HistoryScreen\b/);
    expect(src).not.toMatch(/<\s*ProgressScreen\b/);
    // Types + localDateKey helpers are ok; IDB store modules are not.
    expect(src).not.toMatch(
      /@\/lib\/db\/(index|cycle|sessions|badges|prs|program|activeSession|soreness)\b/,
    );

    render(
      <BackupPreviewView
        backup={fixtureBackup()}
        fallbackUnits="lb"
        onClose={() => {}}
        today={TODAY}
      />,
    );
    expect(screen.getByTestId("backup-preview")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Go to today’s session/);
    expect(document.body.textContent).not.toMatch(/Start from Home/);
  });
});

describe("BackupPreviewView rendering", () => {
  it("renders duration, volume, PR hits, and exercise rows for a known fixture", () => {
    const backup = fixtureBackup();
    render(
      <BackupPreviewView
        backup={backup}
        fallbackUnits="lb"
        onClose={() => {}}
        today={TODAY}
      />,
    );

    fireEvent.click(screen.getByTestId(`session-row-${SESSION_DATE}`));

    expect(screen.getByTestId(`session-duration-${SESSION_DATE}`).textContent).toBe(
      "1h 15m",
    );
    expect(screen.getByTestId(`session-volume-${SESSION_DATE}`).textContent).toBe(
      formatVolumeDisplay(400, "kg"),
    );
    expect(screen.getByTestId(`session-pr-hits-${SESSION_DATE}`).textContent).toMatch(
      /1/,
    );
    expect(
      screen.getByTestId(`session-exercise-${EX_ID}`).textContent,
    ).toMatch(/Chest Press Machine/);
    expect(screen.getByTestId(`progress-pr-card-${EX_ID}`)).toBeTruthy();
    expect(screen.getByTestId("progress-badge-first-pr")).toBeTruthy();
    expect(screen.getByTestId("backup-preview-banner").textContent).toMatch(
      /Nothing is saved/,
    );
  });

  it("shows no PR for a 0-weight set on an external lift", () => {
    const backup = fixtureBackup({
      data: {
        exerciseHistory: {
          [EX_ID]: [
            {
              date: SESSION_DATE,
              dayKey: "push",
              sets: [
                {
                  id: "z",
                  weightKg: 0,
                  reps: 8,
                  loggedAt: `${SESSION_DATE}T18:10:00.000Z`,
                },
              ],
            },
          ],
        },
      },
    });
    // seed confirms external
    expect(buildProgramFromSeed().exercises[EX_ID]?.loadType).toBe("external");

    render(
      <BackupPreviewView
        backup={backup}
        fallbackUnits="kg"
        onClose={() => {}}
        today={TODAY}
      />,
    );

    expect(screen.queryByTestId(`progress-pr-card-${EX_ID}`)).toBeNull();
    expect(screen.getByText(/No PRs in this backup/)).toBeTruthy();
  });

  it("shows seed exercise names when program is omitted from the file", () => {
    const backup = fixtureBackup();
    expect(backup.data.program).toBeUndefined();
    render(
      <BackupPreviewView
        backup={backup}
        fallbackUnits="kg"
        onClose={() => {}}
        today={TODAY}
      />,
    );
    fireEvent.click(screen.getByTestId(`session-row-${SESSION_DATE}`));
    expect(
      screen.getByTestId(`session-exercise-${EX_ID}`).textContent,
    ).toContain("Chest Press Machine");
  });

  it("works when the device would be considered non-empty (viewer ignores device)", () => {
    // parseBackupForView has no emptiness gate — rendering alone proves it.
    const backup = parseBackupForView(JSON.stringify(fixtureBackup()));
    render(
      <BackupPreviewView
        backup={backup}
        fallbackUnits="lb"
        onClose={() => {}}
        today={TODAY}
      />,
    );
    expect(screen.getByTestId("backup-preview-sessions")).toBeTruthy();
  });
});

describe("parseBackupForView rejects bad files before preview", () => {
  it("rejects malformed JSON, wrong shape, and newer schema", () => {
    expect(() => parseBackupForView("{")).toThrow(/valid JSON/i);
    expect(() => parseBackupForView(JSON.stringify({ schemaVersion: 1 }))).toThrow();
    expect(() =>
      parseBackupForView(
        JSON.stringify(fixtureBackup({ schemaVersion: 99 })),
      ),
    ).toThrow(/newer version/i);
  });
});

describe("BackupPreviewView storage isolation", () => {
  it("performs zero db reads/writes and zero localStorage writes while mounting, expanding, and closing", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");
    const onClose = vi.fn();

    render(
      <BackupPreviewView
        backup={fixtureBackup()}
        fallbackUnits="kg"
        onClose={onClose}
        today={TODAY}
      />,
    );

    fireEvent.click(screen.getByTestId(`session-row-${SESSION_DATE}`));
    expect(screen.getByTestId(`session-detail-${SESSION_DATE}`)).toBeTruthy();
    fireEvent.click(screen.getByTestId("backup-preview-close"));
    expect(onClose).toHaveBeenCalledOnce();

    expect(getDB).not.toHaveBeenCalled();
    expect(getStoreValue).not.toHaveBeenCalled();
    expect(setStoreValue).not.toHaveBeenCalled();
    expect(deleteStoreValue).not.toHaveBeenCalled();
    expect(runStoresTransaction).not.toHaveBeenCalled();
    expect(loadCalendar).not.toHaveBeenCalled();
    expect(loadAllHistory).not.toHaveBeenCalled();
    expect(loadAllSessions).not.toHaveBeenCalled();
    expect(loadAllBadges).not.toHaveBeenCalled();
    expect(persistBadges).not.toHaveBeenCalled();
    expect(deleteBadge).not.toHaveBeenCalled();
    expect(savePR).not.toHaveBeenCalled();
    expect(loadProgram).not.toHaveBeenCalled();
    expect(getPrefs).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();

    setItem.mockRestore();
    removeItem.mockRestore();
  });
});
