import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEntry } from "@/lib/program/cycle";
import { buildProgramFromSeed } from "@/lib/program/seed";

const loadCalendar = vi.hoisted(() => vi.fn());
const loadAllHistory = vi.hoisted(() => vi.fn());
const loadAllSessions = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/cycle", () => ({
  loadCalendar,
}));

vi.mock("@/lib/db/history", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/history")>();
  return {
    ...actual,
    loadAllHistory,
    localDateKey: () => "2026-09-02",
  };
});

vi.mock("@/lib/db/sessions", () => ({
  loadAllSessions,
}));

vi.mock("@/components/ProgramProvider", () => ({
  useProgram: () => ({
    program: buildProgramFromSeed(),
    ready: true,
  }),
}));

vi.mock("@/components/PrefsProvider", () => ({
  usePrefs: () => ({
    prefs: { units: "lb" },
    ready: true,
  }),
}));

import { HistoryScreen } from "./HistoryScreen";

afterEach(() => {
  cleanup();
});

describe("HistoryScreen re-reads IndexedDB on each visit", () => {
  beforeEach(() => {
    loadCalendar.mockReset();
    loadAllHistory.mockReset();
    loadAllSessions.mockReset();
    loadAllHistory.mockResolvedValue({});
    loadAllSessions.mockResolvedValue({});
  });

  it("shows a completed cell from the latest load, then a blank after remount with that entry gone", async () => {
    const withCompleted: Record<string, CalendarEntry> = {
      "2026-09-01": { status: "completed", dayKey: "push" },
    };
    loadCalendar.mockResolvedValue(withCompleted);

    const first = render(<HistoryScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("week-cell-completed")).toBeTruthy();
    });
    expect(screen.getByTestId("week-cell-completed").getAttribute("data-date")).toBe(
      "2026-09-01",
    );
    first.unmount();

    loadCalendar.mockResolvedValue({});
    render(<HistoryScreen />);
    await waitFor(() => {
      expect(screen.queryByTestId("week-cell-completed")).toBeNull();
    });
    const sept1 = screen
      .getAllByTestId("week-cell-blank")
      .find((el) => el.getAttribute("data-date") === "2026-09-01");
    expect(sept1).toBeTruthy();
    expect(loadCalendar.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("drops the session list row on remount when calendar no longer has that date, even if leftover history and sessions remain", async () => {
    const leftoverHistory = {
      "push-ups": [
        {
          date: "2026-09-01",
          dayKey: "push" as const,
          sets: [
            {
              id: "s1",
              weightKg: 20,
              reps: 10,
              loggedAt: "2026-09-01T18:00:00.000Z",
            },
          ],
        },
      ],
    };
    const leftoverSession = {
      "2026-09-01": {
        date: "2026-09-01",
        dayKey: "push" as const,
        type: "program" as const,
        entries: [],
        cardio: null,
        complete: true,
      },
    };

    loadCalendar.mockResolvedValue({
      "2026-09-01": { status: "completed", dayKey: "push" },
    });
    loadAllHistory.mockResolvedValue(leftoverHistory);
    loadAllSessions.mockResolvedValue(leftoverSession);

    const first = render(<HistoryScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("session-row-2026-09-01")).toBeTruthy();
    });
    first.unmount();

    loadCalendar.mockResolvedValue({});
    loadAllHistory.mockResolvedValue(leftoverHistory);
    loadAllSessions.mockResolvedValue(leftoverSession);
    render(<HistoryScreen />);
    await waitFor(() => {
      expect(screen.queryByTestId("week-cell-completed")).toBeNull();
    });
    expect(screen.queryByTestId("session-row-2026-09-01")).toBeNull();
    expect(loadCalendar.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(loadAllHistory.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
