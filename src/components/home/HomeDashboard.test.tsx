import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addLocalDays,
  evaluateCycle,
  initialCycleState,
  startProgram,
  type CalendarEntry,
  type CycleState,
} from "@/lib/program/cycle";
import { CYCLE_DAYS } from "@/lib/program/days";
import { mobilityForMuscles } from "@/lib/program/mobility";
import { buildProgramFromSeed } from "@/lib/program/seed";
import type { HistoryEntry } from "@/lib/db/history";
import type { ProgramContextValue } from "@/components/ProgramProvider";

const mockToday = vi.hoisted(() => ({ value: "2026-08-26" }));
const programMock = vi.hoisted(() => ({
  current: null as Partial<ProgramContextValue> | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/alerts/AlertProvider", () => ({
  useAlerts: () => ({
    info: vi.fn(),
    danger: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock("@/components/PrefsProvider", () => ({
  usePrefs: () => ({ prefs: { units: "lb" } }),
}));

vi.mock("@/lib/db/history", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/history")>();
  return {
    ...actual,
    localDateKey: () => mockToday.value,
  };
});

vi.mock("@/components/ProgramProvider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/ProgramProvider")>();
  return {
    ...actual,
    useProgram: () => programMock.current,
  };
});

import { HomeDashboard } from "./HomeDashboard";

const program = buildProgramFromSeed();

function startedCycle(overrides: Partial<CycleState> = {}): CycleState {
  return { ...startProgram(mockToday.value), ...overrides };
}

function renderHome(overrides: Partial<ProgramContextValue> = {}) {
  const chooseDifferentDay = vi.fn().mockResolvedValue(undefined);
  const pickupLongGap = vi.fn().mockResolvedValue(undefined);
  const jumpLongGap = vi.fn().mockResolvedValue(undefined);
  programMock.current = {
    program,
    notes: {},
    history: {},
    calendar: {},
    cycle: startedCycle(),
    soreness: {},
    todayKey: "push",
    todaySlot: 0,
    ready: true,
    activeSession: null,
    saveNote: vi.fn(),
    logSet: vi.fn(),
    deleteSet: vi.fn(),
    logRecoveryDay: vi.fn(),
    revertRecoveryDay: vi.fn(),
    logFinisherCardio: vi.fn(),
    startProgramToday: vi.fn(),
    startSession: vi.fn(),
    chooseDifferentDay,
    pickupLongGap,
    jumpLongGap,
    patchActiveSession: vi.fn(),
    finishWorkout: vi.fn(),
    daysFor: () => [],
    ...overrides,
  };
  render(<HomeDashboard />);
  return { chooseDifferentDay, pickupLongGap, jumpLongGap };
}

afterEach(() => {
  cleanup();
  programMock.current = null;
});

beforeEach(() => {
  mockToday.value = "2026-08-26";
});

describe("HomeDashboard rest-day mobility", () => {
  it("renders mobilityForMuscles fallback, not the old placeholder", () => {
    renderHome({ todayKey: "rest", todaySlot: 3 });
    expect(screen.getByTestId("rest-day-mobility")).toBeTruthy();
    expect(
      screen.queryByText(/will show here after you’ve logged/i),
    ).toBeNull();
    for (const s of mobilityForMuscles([])) {
      expect(screen.getByText(s.title)).toBeTruthy();
    }
  });

  it("passes recent history muscles through mobilityForMuscles", () => {
    const history: Record<string, HistoryEntry[]> = {
      "seated-leg-curl": [
        {
          date: "2026-08-25",
          dayKey: "lower",
          sets: [
            {
              id: "s1",
              weightKg: 40,
              reps: 12,
              loggedAt: "2026-08-25T18:00:00.000Z",
            },
          ],
        },
      ],
    };
    renderHome({ todayKey: "rest", todaySlot: 3, history });
    const selected = mobilityForMuscles(["hamstrings"]);
    const generic = mobilityForMuscles([]);
    expect(selected).not.toEqual(generic);
    expect(screen.getByText(selected[0]!.title)).toBeTruthy();
    const leftover = generic.find(
      (g) => !selected.some((s) => s.title === g.title),
    );
    expect(leftover).toBeTruthy();
    expect(screen.queryByText(leftover!.title)).toBeNull();
  });
});

describe("HomeDashboard choose a different day", () => {
  it("confirms with the spec copy and calls the provider chooseDifferentDay", () => {
    const { chooseDifferentDay } = renderHome({ todayKey: "push" });
    fireEvent.click(screen.getByTestId("choose-different-day"));
    fireEvent.click(screen.getByTestId("choose-day-legs"));
    expect(screen.getByTestId("choose-day-confirm-copy").textContent).toBe(
      "This will mark Push as skipped, not missed — continue?",
    );
    fireEvent.click(screen.getByTestId("choose-day-confirm"));
    expect(chooseDifferentDay).toHaveBeenCalledWith("legs");
  });
});

describe("HomeDashboard long-gap prompt", () => {
  it("fires after 6 unexplained days and pick up calls pickupLongGap", () => {
    const gapped = evaluateCycle(
      startProgram("2026-08-20"),
      "2026-08-26",
      CYCLE_DAYS,
    ).state;
    const { pickupLongGap } = renderHome({
      todayKey: "push",
      cycle: gapped,
      calendar: {},
    });
    expect(screen.getByTestId("long-gap-prompt")).toBeTruthy();
    fireEvent.click(screen.getByTestId("long-gap-pickup"));
    expect(pickupLongGap).toHaveBeenCalledTimes(1);
  });

  it("fires after 6 unexplained days and jump calls jumpLongGap", () => {
    const gapped = evaluateCycle(
      startProgram("2026-08-20"),
      "2026-08-26",
      CYCLE_DAYS,
    ).state;
    const { jumpLongGap } = renderHome({
      todayKey: "push",
      cycle: gapped,
      calendar: {},
    });
    fireEvent.click(screen.getByTestId("long-gap-jump"));
    expect(jumpLongGap).toHaveBeenCalledTimes(1);
  });

  it("does not fire on a fresh start", () => {
    renderHome({
      todayKey: "push",
      cycle: startProgram("2026-08-26"),
    });
    expect(screen.queryByTestId("long-gap-prompt")).toBeNull();
  });

  it("does not fire when the program is unstarted", () => {
    renderHome({
      cycle: initialCycleState("2026-08-26"),
      todayKey: "push",
    });
    expect(screen.queryByTestId("long-gap-prompt")).toBeNull();
    expect(screen.getByText("Start my program today")).toBeTruthy();
  });

  it("does not fire across consecutive recovery days", () => {
    const pending = "2026-08-20";
    const calendar: Record<string, CalendarEntry> = {};
    for (let i = 0; i < 6; i++) {
      calendar[addLocalDays(pending, i)] = {
        status: "recovery",
        dayKey: "rest",
      };
    }
    const later = evaluateCycle(
      startProgram(pending),
      "2026-08-26",
      CYCLE_DAYS,
    ).state;
    renderHome({ cycle: later, calendar, todayKey: "push" });
    expect(screen.queryByTestId("long-gap-prompt")).toBeNull();
  });
});
