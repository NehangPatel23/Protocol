import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WeekStrip } from "./WeekCell";
import type { CalendarEntry } from "@/lib/program/cycle";

afterEach(() => {
  cleanup();
});

const weekStart = "2026-08-24"; // Monday
const today = "2026-08-26";

describe("WeekStrip status cells", () => {
  it("renders three distinct accessible states for completed, recovery, and missed", () => {
    const calendar: Record<string, CalendarEntry> = {
      "2026-08-24": { status: "completed", dayKey: "push" },
      "2026-08-25": { status: "recovery", dayKey: "rest" },
      "2026-08-26": { status: "missed", dayKey: "pull" },
    };

    render(
      <WeekStrip weekStart={weekStart} today={today} calendar={calendar} />,
    );

    const completed = screen.getByTestId("week-cell-completed");
    const recovery = screen.getByTestId("week-cell-recovery");
    const missed = screen.getByTestId("week-cell-missed");

    expect(completed.getAttribute("aria-label")).toBe("Completed");
    expect(recovery.getAttribute("aria-label")).toBe("Active Recovery");
    expect(missed.getAttribute("aria-label")).toBe("Missed: Pull");

    expect(completed.getAttribute("aria-label")).not.toBe(
      recovery.getAttribute("aria-label"),
    );
    expect(completed.getAttribute("data-icon")).toBe("check");
    expect(recovery.getAttribute("data-icon")).toBe("leaf");
    expect(completed.getAttribute("data-icon")).not.toBe(
      recovery.getAttribute("data-icon"),
    );
    expect(missed.getAttribute("data-icon")).toBe("x");
  });

  it("shows a rest cell as a hollow outline, not a filled box", () => {
    const calendar: Record<string, CalendarEntry> = {
      "2026-08-24": { status: "rest", dayKey: "rest" },
    };

    render(
      <WeekStrip weekStart={weekStart} today={today} calendar={calendar} />,
    );

    const rest = screen.getByTestId("week-cell-rest");
    expect(rest.getAttribute("aria-label")).toBe("Rest");
    expect(rest.className).toContain("bg-transparent");
    expect(rest.className).toContain("border-2");
    expect(rest.className).not.toContain("bg-surface");
  });

  it("shows Missed: [Day name] after tapping a missed cell", () => {
    const calendar: Record<string, CalendarEntry> = {
      "2026-08-26": { status: "missed", dayKey: "pull" },
    };

    render(
      <WeekStrip weekStart={weekStart} today={today} calendar={calendar} />,
    );

    expect(screen.queryByText("Missed: Pull")).toBeNull();
    fireEvent.click(screen.getByTestId("week-cell-missed"));
    expect(screen.getByText("Missed: Pull")).toBeTruthy();
  });
});
