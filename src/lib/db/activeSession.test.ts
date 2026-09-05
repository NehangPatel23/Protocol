import { beforeEach, describe, expect, it, vi } from "vitest";

const getStoreValue = vi.hoisted(() => vi.fn());
const setStoreValue = vi.hoisted(() => vi.fn());
const deleteStoreValue = vi.hoisted(() => vi.fn());

vi.mock("./index", () => ({
  getStoreValue,
  setStoreValue,
  deleteStoreValue,
}));

import {
  clearActiveSession,
  createActiveSession,
  loadActiveSession,
  saveActiveSession,
} from "./activeSession";

describe("activeSession store", () => {
  beforeEach(() => {
    getStoreValue.mockReset();
    setStoreValue.mockReset();
    deleteStoreValue.mockReset();
    setStoreValue.mockResolvedValue(undefined);
    deleteStoreValue.mockResolvedValue(undefined);
  });

  it("persists currentStep so a reopen can resume the same exercise", async () => {
    const session = createActiveSession("2026-09-01", "push");
    session.currentStep = 3;
    await saveActiveSession(session);
    expect(setStoreValue).toHaveBeenCalledWith("activeSession", "current", session);

    getStoreValue.mockResolvedValue(session);
    const loaded = await loadActiveSession();
    expect(loaded?.currentStep).toBe(3);
    expect(loaded?.date).toBe("2026-09-01");
    expect(loaded?.dayKey).toBe("push");
  });

  it("createActiveSession locks the calendar date at start", () => {
    const session = createActiveSession("2026-09-01", "pull");
    expect(session.date).toBe("2026-09-01");
    expect(session.currentStep).toBe(0);
    expect(session.restEndsAt).toBeNull();
  });

  it("clearActiveSession deletes the current record", async () => {
    await clearActiveSession();
    expect(deleteStoreValue).toHaveBeenCalledWith("activeSession", "current");
  });
});
