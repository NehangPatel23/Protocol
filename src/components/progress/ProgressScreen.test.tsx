import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { HistoryEntry } from "@/lib/db/history";
import { buildProgramFromSeed } from "@/lib/program/seed";
import { ProgressView } from "./ProgressScreen";

afterEach(() => {
  cleanup();
});

const program = buildProgramFromSeed();
const today = "2026-09-06";

function renderProgress(history: Record<string, HistoryEntry[]>) {
  return render(
    <ProgressView
      history={history}
      program={program}
      today={today}
      units="lb"
    />,
  );
}

describe("ProgressView empty and sparse states", () => {
  it("shows a page-level empty state when history has nothing to project", () => {
    renderProgress({});
    expect(screen.getByText("Not enough data yet")).toBeTruthy();
    expect(screen.queryByTestId("progress-pr-wall")).toBeNull();
    expect(screen.queryByTestId("progress-volume")).toBeNull();
    expect(screen.getByRole("link", { name: /today’s session/i })).toBeTruthy();
  });

  it("does not treat warmup-only history as a PR wall", () => {
    renderProgress({
      deadlift: [
        {
          date: today,
          sets: [
            {
              id: "wu",
              weightKg: 20,
              reps: 10,
              loggedAt: `${today}T18:00:00.000Z`,
            },
          ],
        },
      ],
    });
    expect(screen.getByText("Not enough data yet")).toBeTruthy();
    expect(screen.queryByTestId("progress-pr-card-deadlift")).toBeNull();
  });

  it("one real PR is a trophy card plus a sparse caption — not a blank wall", () => {
    renderProgress({
      "chest-press-machine": [
        {
          date: today,
          sets: [
            {
              id: "s1",
              weightKg: 20,
              reps: 12,
              loggedAt: `${today}T18:00:00.000Z`,
            },
          ],
        },
      ],
    });
    expect(screen.getByTestId("progress-pr-sparse")).toBeTruthy();
    expect(screen.getByTestId("progress-pr-card-chest-press-machine")).toBeTruthy();
    expect(screen.getByTestId("progress-pr-wall").getAttribute("data-count")).toBe(
      "1",
    );
    expect(screen.getByText(/Chest Press Machine/i)).toBeTruthy();
  });

  it("renders inverse-weight as assist, not as a heavier-is-better number", () => {
    renderProgress({
      "weighted-assisted-pullups": [
        {
          date: today,
          sets: [
            {
              id: "s1",
              weightKg: 26,
              reps: 12,
              loggedAt: `${today}T18:00:00.000Z`,
            },
          ],
        },
      ],
    });
    const card = screen.getByTestId("progress-pr-card-weighted-assisted-pullups");
    expect(card.textContent).toMatch(/assist/i);
  });

  it("shows an explicit period empty state instead of comparing against empty weeks", () => {
    renderProgress({
      "chest-press-machine": [
        {
          date: today,
          sets: [
            {
              id: "s1",
              weightKg: 20,
              reps: 12,
              loggedAt: `${today}T18:00:00.000Z`,
            },
          ],
        },
      ],
    });
    expect(screen.getByTestId("progress-period-empty")).toBeTruthy();
    expect(screen.queryByTestId("progress-period")).toBeNull();
  });

  it("renders a period comparison when both 4-week windows have working sets", () => {
    renderProgress({
      "row-cable": [
        {
          date: "2026-07-20",
          sets: [
            {
              id: "old",
              weightKg: 25,
              reps: 12,
              loggedAt: "2026-07-20T18:00:00.000Z",
            },
          ],
        },
        {
          date: today,
          sets: [
            {
              id: "new",
              weightKg: 30,
              reps: 12,
              loggedAt: `${today}T18:00:00.000Z`,
            },
          ],
        },
      ],
    });
    expect(screen.getByTestId("progress-period")).toBeTruthy();
    expect(screen.getByTestId("progress-period-lift-row-cable")).toBeTruthy();
    expect(screen.getByTestId("progress-period-muscle-back")).toBeTruthy();
  });

  it("flags a stalled lift and does not flag one that added weight", () => {
    const stalledDates = ["2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"];
    render(
      <ProgressView
        history={{
          "chest-press-machine": stalledDates.map((date) => ({
            date,
            sets: [
              {
                id: date,
                weightKg: 20,
                reps: 12,
                loggedAt: `${date}T18:00:00.000Z`,
              },
            ],
          })),
          "row-cable": stalledDates.map((date, i) => ({
            date,
            sets: [
              {
                id: `row-${date}`,
                weightKg: i === 3 ? 30 : 25,
                reps: 12,
                loggedAt: `${date}T18:00:00.000Z`,
              },
            ],
          })),
        }}
        program={program}
        today={today}
        units="lb"
      />,
    );
    expect(screen.getByTestId("progress-plateau-chest-press-machine")).toBeTruthy();
    expect(screen.queryByTestId("progress-plateau-row-cable")).toBeNull();
  });

  it("does not show a plateau callout while pause mode is active", () => {
    const dates = ["2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"];
    render(
      <ProgressView
        history={{
          "chest-press-machine": dates.map((date) => ({
            date,
            sets: [
              {
                id: date,
                weightKg: 20,
                reps: 12,
                loggedAt: `${date}T18:00:00.000Z`,
              },
            ],
          })),
        }}
        program={program}
        today={today}
        units="lb"
        pauseMode={{ active: true, until: "2026-09-20" }}
      />,
    );
    expect(screen.queryByTestId("progress-plateau-chest-press-machine")).toBeNull();
  });

  it("shows first-pr and ten-sessions from existing history/calendar without a clean slate", () => {
    const dates = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(2026, 7, 20 + i);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${d.getFullYear()}-${mm}-${dd}`;
    });
    const calendar = Object.fromEntries(
      dates.map((date) => [date, { status: "completed" as const, dayKey: "push" as const }]),
    );
    render(
      <ProgressView
        history={{
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
        }}
        program={program}
        today={today}
        units="lb"
        calendar={calendar}
      />,
    );
    expect(screen.getByTestId("progress-badge-first-pr")).toBeTruthy();
    expect(screen.getByTestId("progress-badge-ten-sessions")).toBeTruthy();
  });

  it("renders an RPE trend when two sessions stored RPE, and not from weight-only logs", () => {
    renderProgress({
      "chest-press-machine": [
        {
          date: "2026-08-20",
          sets: [
            {
              id: "a",
              weightKg: 20,
              reps: 12,
              rpe: 7,
              loggedAt: "2026-08-20T18:00:00.000Z",
            },
          ],
        },
        {
          date: today,
          sets: [
            {
              id: "b",
              weightKg: 20,
              reps: 12,
              rpe: 9,
              loggedAt: `${today}T18:00:00.000Z`,
            },
          ],
        },
      ],
    });
    expect(screen.getByTestId("progress-rpe")).toBeTruthy();
    expect(screen.getByTestId("progress-rpe-chart")).toBeTruthy();
  });
});
