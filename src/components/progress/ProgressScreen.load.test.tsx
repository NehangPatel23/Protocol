import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildProgramFromSeed } from "@/lib/program/seed";

const loadAllHistory = vi.hoisted(() => vi.fn());
const loadCalendar = vi.hoisted(() => vi.fn());
const loadAllBadges = vi.hoisted(() => vi.fn());
const persistBadges = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/history", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/history")>();
  return {
    ...actual,
    loadAllHistory,
    localDateKey: () => "2026-09-06",
  };
});

vi.mock("@/lib/db/cycle", () => ({
  loadCalendar,
}));

vi.mock("@/lib/db/badges", () => ({
  loadAllBadges,
  persistBadges,
}));

vi.mock("@/components/ProgramProvider", () => ({
  useProgram: () => ({
    program: buildProgramFromSeed(),
    ready: true,
  }),
}));

vi.mock("@/components/PrefsProvider", () => ({
  usePrefs: () => ({
    prefs: {
      units: "lb",
      pauseMode: { active: false, until: null },
    },
    ready: true,
  }),
}));

import { ProgressScreen } from "./ProgressScreen";

afterEach(() => {
  cleanup();
});

describe("ProgressScreen re-reads IndexedDB on each visit", () => {
  beforeEach(() => {
    loadAllHistory.mockReset();
    loadAllHistory.mockResolvedValue({});
    loadCalendar.mockReset();
    loadCalendar.mockResolvedValue({});
    loadAllBadges.mockReset();
    loadAllBadges.mockResolvedValue({});
    persistBadges.mockReset();
    persistBadges.mockResolvedValue(undefined);
  });

  it("shows a PR card from the latest load, then the empty state after remount with history gone", async () => {
    loadAllHistory.mockResolvedValue({
      "chest-press-machine": [
        {
          date: "2026-09-06",
          dayKey: "push",
          sets: [
            {
              id: "s1",
              weightKg: 20,
              reps: 12,
              loggedAt: "2026-09-06T18:00:00.000Z",
            },
          ],
        },
      ],
    });

    const first = render(<ProgressScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("progress-pr-card-chest-press-machine")).toBeTruthy();
    });
    first.unmount();

    loadAllHistory.mockResolvedValue({});
    render(<ProgressScreen />);
    await waitFor(() => {
      expect(screen.queryByTestId("progress-pr-card-chest-press-machine")).toBeNull();
    });
    expect(screen.getByText("Not enough data yet")).toBeTruthy();
    expect(loadAllHistory.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("persists first-pr into the badges store from already-logged history", async () => {
    loadAllHistory.mockResolvedValue({
      "chest-press-machine": [
        {
          date: "2026-08-20",
          sets: [
            {
              id: "s1",
              weightKg: 20,
              reps: 12,
              loggedAt: "2026-08-20T18:00:00.000Z",
            },
          ],
        },
      ],
    });

    render(<ProgressScreen />);
    await waitFor(() => {
      expect(persistBadges).toHaveBeenCalled();
    });
    const written = persistBadges.mock.calls[0][0] as Array<{ id: string }>;
    expect(written.some((b) => b.id === "first-pr")).toBe(true);
  });
});
