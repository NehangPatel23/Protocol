import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RestTimer } from "./RestTimer";
import { restEndsAtIso } from "@/lib/session/restTimer";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("RestTimer remount resume", () => {
  it("recomputes remaining time from endsAt after unmount — it does not restart the duration", () => {
    const t0 = Date.parse("2026-09-01T18:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(t0);
    const endsAt = restEndsAtIso(90, t0);

    const { unmount } = render(
      <RestTimer
        endsAt={endsAt}
        durationSec={90}
        onSkip={() => {}}
        onExtend={() => {}}
      />,
    );
    expect(screen.getByLabelText("Rest 1:30")).toBeTruthy();
    unmount();

    vi.setSystemTime(t0 + 30_000);
    render(
      <RestTimer
        endsAt={endsAt}
        durationSec={90}
        onSkip={() => {}}
        onExtend={() => {}}
      />,
    );
    expect(screen.getByLabelText("Rest 1:00")).toBeTruthy();
    expect(screen.queryByLabelText("Rest 1:30")).toBeNull();
  });
});
