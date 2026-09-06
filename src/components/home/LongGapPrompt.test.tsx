import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as cycle from "@/lib/program/cycle";
import {
  evaluateCycle,
  shouldPromptLongGap,
  startProgram,
  weekdaySuggestedDay,
} from "@/lib/program/cycle";
import { CYCLE_DAYS, DAY_LABELS } from "@/lib/program/days";
import { LongGapPrompt } from "./LongGapPrompt";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const today = "2026-08-26";
const gapped = evaluateCycle(startProgram("2026-08-20"), today, CYCLE_DAYS).state;

describe("LongGapPrompt", () => {
  it("does not render when shouldPromptLongGap is false", () => {
    const spy = vi.spyOn(cycle, "shouldPromptLongGap");
    const started = startProgram(today);
    const { container } = render(
      <LongGapPrompt
        cycle={started}
        today={today}
        calendar={{}}
        cycleOrder={CYCLE_DAYS}
        pendingDayKey="push"
        onPickup={() => {}}
        onJump={() => {}}
      />,
    );
    expect(spy).toHaveBeenCalledWith(started, today, {});
    expect(shouldPromptLongGap(started, today, {})).toBe(false);
    expect(container.querySelector('[data-testid="long-gap-prompt"]')).toBeNull();
  });

  it("calls shouldPromptLongGap and weekdaySuggestedDay, and offers both exact choices", () => {
    const gapSpy = vi.spyOn(cycle, "shouldPromptLongGap");
    const daySpy = vi.spyOn(cycle, "weekdaySuggestedDay");
    const onPickup = vi.fn();
    const onJump = vi.fn();
    expect(shouldPromptLongGap(gapped, today, {})).toBe(true);

    render(
      <LongGapPrompt
        cycle={gapped}
        today={today}
        calendar={{}}
        cycleOrder={CYCLE_DAYS}
        pendingDayKey="push"
        onPickup={onPickup}
        onJump={onJump}
      />,
    );

    expect(gapSpy).toHaveBeenCalledWith(gapped, today, {});
    expect(daySpy).toHaveBeenCalledWith(today, CYCLE_DAYS);
    const suggested = weekdaySuggestedDay(today, CYCLE_DAYS);
    expect(suggested).toBe("legs");
    expect(screen.getByTestId("long-gap-prompt")).toBeTruthy();
    expect(screen.getByTestId("long-gap-pickup").textContent).toMatch(
      new RegExp(`Pick up ${DAY_LABELS.push}`),
    );
    expect(screen.getByTestId("long-gap-jump").textContent).toMatch(
      new RegExp(`Jump to ${DAY_LABELS[suggested]}`),
    );

    fireEvent.click(screen.getByTestId("long-gap-pickup"));
    expect(onPickup).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("long-gap-jump"));
    expect(onJump).toHaveBeenCalledTimes(1);
  });
});
