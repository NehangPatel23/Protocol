import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { CalendarEntry } from "@/lib/program/cycle";
import type { HistoryEntry } from "@/lib/db/history";
import { buildProgramFromSeed } from "@/lib/program/seed";
import { HistoryView } from "./HistoryScreen";

afterEach(() => {
  cleanup();
});

const program = buildProgramFromSeed();
const today = "2026-09-02";

const mixedCalendar: Record<string, CalendarEntry> = {
  "2026-09-01": { status: "completed", dayKey: "push" },
  "2026-09-02": { status: "missed", dayKey: "pull" },
  "2026-09-03": { status: "recovery", dayKey: "rest" },
  "2026-09-04": { status: "rest", dayKey: "rest" },
};

const history: Record<string, HistoryEntry[]> = {
  "chest-press-machine": [
    {
      date: "2026-09-01",
      dayKey: "push",
      sets: [
        {
          id: "s1",
          weightKg: 30,
          reps: 12,
          loggedAt: "2026-09-01T18:00:00.000Z",
        },
      ],
    },
  ],
};

function renderMonth(
  calendar: Record<string, CalendarEntry>,
  extra?: Partial<ComponentProps<typeof HistoryView>>,
) {
  const onSelectDate = vi.fn();
  const view = render(
    <HistoryView
      calendar={calendar}
      history={history}
      sessions={{}}
      program={program}
      today={today}
      units="lb"
      year={2026}
      monthIndex={8}
      selectedDate={null}
      onSelectDate={onSelectDate}
      onPrevMonth={() => {}}
      onNextMonth={() => {}}
      {...extra}
    />,
  );
  return { ...view, onSelectDate };
}

describe("HistoryView calendar reads real calendar data", () => {
  it("renders completed, recovery, missed, rest, and blank as distinct cells in the same month", () => {
    renderMonth(mixedCalendar);

    const completed = screen.getByTestId("week-cell-completed");
    const recovery = screen.getByTestId("week-cell-recovery");
    const missed = screen.getByTestId("week-cell-missed");
    const rest = screen.getByTestId("week-cell-rest");
    const blanks = screen.getAllByTestId("week-cell-blank");

    expect(completed.getAttribute("data-date")).toBe("2026-09-01");
    expect(completed.getAttribute("data-icon")).toBe("check");
    expect(completed.getAttribute("aria-label")).toBe("Completed");

    expect(recovery.getAttribute("data-date")).toBe("2026-09-03");
    expect(recovery.getAttribute("data-icon")).toBe("leaf");
    expect(recovery.getAttribute("aria-label")).toBe("Active Recovery");

    expect(missed.getAttribute("data-date")).toBe("2026-09-02");
    expect(missed.getAttribute("data-icon")).toBe("x");
    expect(missed.getAttribute("aria-label")).toBe("Missed: Pull");

    expect(rest.getAttribute("data-date")).toBe("2026-09-04");
    expect(rest.getAttribute("data-status")).toBe("rest");
    expect(rest.getAttribute("data-icon")).toBeNull();
    expect(rest.getAttribute("aria-label")).toBe("Rest");
    expect(rest.className).toContain("bg-transparent");
    expect(rest.className).toContain("border-2");
    expect(rest.className).not.toContain("bg-surface");

    const blankFifth = blanks.find((el) => el.getAttribute("data-date") === "2026-09-05");
    expect(blankFifth).toBeTruthy();
    expect(blankFifth?.getAttribute("data-status")).toBe("blank");
    expect(blankFifth?.getAttribute("data-icon")).toBeNull();
    expect(blankFifth?.getAttribute("aria-label")).not.toMatch(/Missed/);
    expect(blankFifth?.getAttribute("aria-label")).not.toBe("Completed");
    expect(blankFifth?.getAttribute("aria-label")).not.toBe("Active Recovery");
  });

  it("does not render a completed cell when that calendar entry is removed", () => {
    const { rerender, onSelectDate } = renderMonth(mixedCalendar);
    expect(screen.getByTestId("week-cell-completed").getAttribute("data-date")).toBe(
      "2026-09-01",
    );

    const withoutCompleted = { ...mixedCalendar };
    delete withoutCompleted["2026-09-01"];
    rerender(
      <HistoryView
        calendar={withoutCompleted}
        history={{}}
        sessions={{}}
        program={program}
        today={today}
        units="lb"
        year={2026}
        monthIndex={8}
        selectedDate={null}
        onSelectDate={onSelectDate}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
      />,
    );

    expect(screen.queryByTestId("week-cell-completed")).toBeNull();
    const sept1 = screen
      .getAllByTestId("week-cell-blank")
      .find((el) => el.getAttribute("data-date") === "2026-09-01");
    expect(sept1).toBeTruthy();
    expect(sept1?.getAttribute("data-status")).toBe("blank");
  });

  it("shows Missed: Pull in the day detail after selecting a missed cell, not as a grid overlay", () => {
    const { onSelectDate, rerender } = renderMonth(mixedCalendar);
    expect(screen.queryByText("Missed: Pull")).toBeNull();
    fireEvent.click(screen.getByTestId("week-cell-missed"));
    expect(onSelectDate).toHaveBeenCalledWith("2026-09-02");
    expect(screen.queryByText("Missed: Pull")).toBeNull();

    rerender(
      <HistoryView
        calendar={mixedCalendar}
        history={history}
        sessions={{}}
        program={program}
        today={today}
        units="lb"
        year={2026}
        monthIndex={8}
        selectedDate="2026-09-02"
        onSelectDate={onSelectDate}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
      />,
    );
    expect(screen.getByText("Missed: Pull")).toBeTruthy();
    expect(screen.getByTestId("history-empty-day").textContent).toMatch(
      /Missed: Pull/,
    );
    expect(screen.queryByText("Missed: Push")).toBeNull();
  });
});

describe("HistoryView session list", () => {
  it("lists the completed day with the exercise that was actually logged", () => {
    renderMonth(mixedCalendar);
    const completedRow = screen.getByTestId("session-row-2026-09-01");
    expect(completedRow).toBeTruthy();
    expect(completedRow.textContent).toMatch(/Push/);
    expect(completedRow.textContent).toMatch(/1 exercise/);
    expect(screen.queryByTestId("session-row-2026-09-02")).toBeNull();
    expect(screen.getByTestId("session-row-2026-09-03")).toBeTruthy();
  });

  it("opens session detail inline under the tapped card, not at the end of the list", () => {
    renderMonth(mixedCalendar);
    fireEvent.click(screen.getByTestId("session-row-2026-09-01"));
    const row = screen.getByTestId("session-row-2026-09-01");
    const detail = screen.getByTestId("session-detail-2026-09-01");
    expect(row.closest("article")).toBe(detail.closest("article"));
    expect(detail.tagName).toBe("DIV");
    expect(detail.className).toContain("border-t");
    expect(detail.className).not.toContain("rounded-xl");
    expect(detail.closest("article")?.className).toContain("border-accent");
    expect(screen.getByTestId("session-exercise-chest-press-machine")).toBeTruthy();
    expect(screen.getByText("Chest Press Machine")).toBeTruthy();
    expect(screen.getByText("1 × 12")).toBeTruthy();
  });

  it("keeps an already-expanded card open when a second card is tapped", () => {
    renderMonth(mixedCalendar);
    fireEvent.click(screen.getByTestId("session-row-2026-09-01"));
    fireEvent.click(screen.getByTestId("session-row-2026-09-03"));
    expect(screen.getByTestId("session-detail-2026-09-01")).toBeTruthy();
    expect(screen.getByTestId("session-detail-2026-09-03")).toBeTruthy();
    fireEvent.click(screen.getByTestId("session-row-2026-09-01"));
    expect(screen.queryByTestId("session-detail-2026-09-01")).toBeNull();
    expect(screen.getByTestId("session-detail-2026-09-03")).toBeTruthy();
  });

  it("renders exercise sets in the detail table for the expanded day", () => {
    renderMonth(mixedCalendar);
    fireEvent.click(screen.getByTestId("session-row-2026-09-01"));
    expect(screen.getByTestId("session-detail-2026-09-01")).toBeTruthy();
    expect(screen.getByTestId("session-exercise-chest-press-machine")).toBeTruthy();
    expect(screen.getByText("Chest Press Machine")).toBeTruthy();
    expect(screen.getByText("1 × 12")).toBeTruthy();
  });

  it("shows the out-of-sequence banner from the sessions store on the logged day", () => {
    renderMonth(mixedCalendar, {
      sessions: {
        "2026-09-01": {
          date: "2026-09-01",
          dayKey: "push",
          type: "program",
          entries: [],
          cardio: null,
          complete: true,
          outOfSequenceBanner: true,
        },
      },
    });
    fireEvent.click(screen.getByTestId("session-row-2026-09-01"));
    expect(screen.getByTestId("out-of-sequence-banner").textContent).toMatch(
      /skipped, not missed/,
    );
  });

  it("shows a genuine empty day state for a blank cell, not a missed label", () => {
    renderMonth(mixedCalendar, { selectedDate: "2026-09-05" });
    const empty = screen.getByTestId("history-empty-day");
    expect(empty.textContent).toMatch(/Nothing logged/);
    expect(empty.textContent).not.toMatch(/Missed/);
  });

  it("drops a session row when the calendar entry is gone even if leftover history remains", () => {
    const { rerender, onSelectDate } = renderMonth(mixedCalendar);
    expect(screen.getByTestId("session-row-2026-09-01")).toBeTruthy();

    const withoutCompleted = { ...mixedCalendar };
    delete withoutCompleted["2026-09-01"];
    rerender(
      <HistoryView
        calendar={withoutCompleted}
        history={history}
        sessions={{
          "2026-09-01": {
            date: "2026-09-01",
            dayKey: "push",
            type: "program",
            entries: [],
            cardio: null,
            complete: true,
          },
        }}
        program={program}
        today={today}
        units="lb"
        year={2026}
        monthIndex={8}
        selectedDate={null}
        onSelectDate={onSelectDate}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
      />,
    );

    expect(screen.queryByTestId("session-row-2026-09-01")).toBeNull();
    expect(screen.getByTestId("session-row-2026-09-03")).toBeTruthy();
  });

  it("shows duration, volume, avg RPE, and a PR-hit count on an expanded session", () => {
    const sets = [
      {
        id: "s1",
        weightKg: 20,
        reps: 10,
        rpe: 7,
        loggedAt: "2026-09-08T18:10:00.000Z",
      },
    ];
    renderMonth(
      { "2026-09-08": { status: "completed", dayKey: "push" } },
      {
        today: "2026-09-23",
        history: {
          "chest-press-machine": [{ date: "2026-09-08", dayKey: "push", sets }],
        },
        sessions: {
          "2026-09-08": {
            date: "2026-09-08",
            dayKey: "push",
            type: "program",
            entries: [],
            cardio: null,
            complete: true,
            startedAt: "2026-09-08T18:00:00.000Z",
            finishedAt: "2026-09-08T19:15:00.000Z",
          },
        },
      },
    );
    fireEvent.click(screen.getByTestId("session-row-2026-09-08"));
    expect(screen.getByTestId("session-duration-2026-09-08").textContent).toBe(
      "1h 15m",
    );
    expect(screen.getByTestId("session-volume-2026-09-08").textContent).toMatch(
      /lb/,
    );
    expect(screen.getByTestId("session-avg-rpe-2026-09-08").textContent).toBe(
      "7",
    );
    expect(screen.getByTestId("session-pr-hits-2026-09-08").textContent).toMatch(
      /1/,
    );
  });

  it("still shows a PR hit on the earlier day after a later session moved the wall", () => {
    renderMonth(
      {
        "2026-09-08": { status: "completed", dayKey: "push" },
        "2026-09-15": { status: "completed", dayKey: "push" },
      },
      {
        today: "2026-09-23",
        history: {
          "chest-press-machine": [
            {
              date: "2026-09-08",
              dayKey: "push",
              sets: [
                {
                  id: "early",
                  weightKg: 20,
                  reps: 10,
                  rpe: 7,
                  loggedAt: "2026-09-08T18:00:00.000Z",
                },
              ],
            },
            {
              date: "2026-09-15",
              dayKey: "push",
              sets: [
                {
                  id: "later",
                  weightKg: 30,
                  reps: 10,
                  rpe: 8,
                  loggedAt: "2026-09-15T18:00:00.000Z",
                },
              ],
            },
          ],
        },
        sessions: {
          "2026-09-08": {
            date: "2026-09-08",
            dayKey: "push",
            type: "program",
            entries: [],
            cardio: null,
            complete: true,
            startedAt: "2026-09-08T18:00:00.000Z",
            finishedAt: "2026-09-08T19:15:00.000Z",
          },
          "2026-09-15": {
            date: "2026-09-15",
            dayKey: "push",
            type: "program",
            entries: [],
            cardio: null,
            complete: true,
            startedAt: "2026-09-15T18:00:00.000Z",
            finishedAt: "2026-09-15T19:00:00.000Z",
          },
        },
      },
    );
    fireEvent.click(screen.getByTestId("session-row-2026-09-08"));
    fireEvent.click(screen.getByTestId("session-row-2026-09-15"));
    expect(screen.getByTestId("session-pr-hits-2026-09-08").textContent).toMatch(
      /1/,
    );
    expect(screen.getByTestId("session-pr-hits-2026-09-15").textContent).toMatch(
      /1/,
    );
  });

  it("omits avg RPE and PRs Hit when there is nothing to show", () => {
    renderMonth(mixedCalendar);
    fireEvent.click(screen.getByTestId("session-row-2026-09-03"));
    expect(screen.queryByTestId("session-avg-rpe-2026-09-03")).toBeNull();
    expect(screen.queryByTestId("session-pr-hits-2026-09-03")).toBeNull();
    expect(screen.queryByTestId("session-duration-2026-09-03")).toBeNull();
  });
});
