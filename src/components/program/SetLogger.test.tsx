import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SetLogger } from "./SetLogger";

vi.mock("@/components/PrefsProvider", () => ({
  usePrefs: () => ({ prefs: { units: "lb" } }),
}));

vi.mock("@/components/alerts/AlertProvider", () => ({
  useAlerts: () => ({
    success: vi.fn(),
    warning: vi.fn(),
    danger: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
});

describe("SetLogger RPE capture", () => {
  it("logs without rpe when the optional control is left unset", async () => {
    const onLog = vi.fn().mockResolvedValue({});
    render(
      <SetLogger
        prType="weight"
        lastWeightKg={20}
        lastReps={10}
        onLog={onLog}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Log set" }));
    await vi.waitFor(() => expect(onLog).toHaveBeenCalled());
    const payload = onLog.mock.calls[0][0];
    expect(payload.rpe).toBeUndefined();
    expect(payload.reps).toBe(10);
  });

  it("includes integer 1–10 RPE on the payload when a value is selected", async () => {
    const onLog = vi.fn().mockResolvedValue({});
    render(
      <SetLogger
        prType="weight"
        lastWeightKg={20}
        lastReps={10}
        onLog={onLog}
      />,
    );
    fireEvent.click(screen.getByTestId("log-rpe-8"));
    fireEvent.click(screen.getByRole("button", { name: "Log set" }));
    await vi.waitFor(() => expect(onLog).toHaveBeenCalled());
    expect(onLog.mock.calls[0][0].rpe).toBe(8);
  });

  it("clears RPE when the same chip is tapped again", async () => {
    const onLog = vi.fn().mockResolvedValue({});
    render(
      <SetLogger
        prType="weight"
        lastWeightKg={20}
        lastReps={10}
        onLog={onLog}
      />,
    );
    fireEvent.click(screen.getByTestId("log-rpe-8"));
    fireEvent.click(screen.getByTestId("log-rpe-8"));
    fireEvent.click(screen.getByRole("button", { name: "Log set" }));
    await vi.waitFor(() => expect(onLog).toHaveBeenCalled());
    expect(onLog.mock.calls[0][0].rpe).toBeUndefined();
  });
});
