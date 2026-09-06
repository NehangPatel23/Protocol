import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CYCLE_DAYS } from "@/lib/program/days";
import { ChooseDifferentDay } from "./ChooseDifferentDay";

afterEach(() => {
  cleanup();
});

describe("ChooseDifferentDay", () => {
  it("uses the spec confirmation copy and calls onChoose with the picked day", () => {
    const onChoose = vi.fn();
    render(
      <ChooseDifferentDay
        pendingDayKey="push"
        cycleOrder={CYCLE_DAYS}
        onChoose={onChoose}
      />,
    );

    fireEvent.click(screen.getByTestId("choose-different-day"));
    fireEvent.click(screen.getByTestId("choose-day-legs"));
    expect(screen.getByTestId("choose-day-confirm-copy").textContent).toBe(
      "This will mark Push as skipped, not missed — continue?",
    );
    fireEvent.click(screen.getByTestId("choose-day-confirm"));
    expect(onChoose).toHaveBeenCalledWith("legs");
    expect(onChoose).toHaveBeenCalledTimes(1);
  });
});
