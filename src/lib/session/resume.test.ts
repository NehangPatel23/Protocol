import { afterEach, describe, expect, it, vi } from "vitest";
import { remainingRestSec, replaceRest } from "@/lib/session/restTimer";
import { clampStep } from "@/lib/session/steps";

const getStoreValue = vi.hoisted(() => vi.fn());
const setStoreValue = vi.hoisted(() => vi.fn());
const deleteStoreValue = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/index", () => ({
  getStoreValue,
  setStoreValue,
  deleteStoreValue,
}));

import {
  createActiveSession,
  loadActiveSession,
  saveActiveSession,
} from "@/lib/db/activeSession";

describe("active session resume from stored record", () => {
  afterEach(() => {
    getStoreValue.mockReset();
    setStoreValue.mockReset();
    deleteStoreValue.mockReset();
    setStoreValue.mockResolvedValue(undefined);
  });

  it("recomputes remaining rest from the stored end-timestamp after a mid-timer close", async () => {
    const t0 = Date.parse("2026-09-01T18:00:00.000Z");
    const session = {
      ...createActiveSession("2026-09-01", "push"),
      ...replaceRest(90, t0),
    };
    await saveActiveSession(session);
    expect(setStoreValue).toHaveBeenCalledWith(
      "activeSession",
      "current",
      expect.objectContaining({
        restEndsAt: session.restEndsAt,
        restDurationSec: 90,
      }),
    );

    getStoreValue.mockResolvedValue(session);
    const reopened = await loadActiveSession();
    expect(reopened?.currentStep).toBe(0);
    expect(reopened?.restEndsAt).toBe(session.restEndsAt);
    expect(remainingRestSec(reopened?.restEndsAt ?? null, t0)).toBe(90);
    expect(remainingRestSec(reopened?.restEndsAt ?? null, t0 + 30_000)).toBe(60);
    expect(remainingRestSec(reopened?.restEndsAt ?? null, t0 + 90_000)).toBe(0);
  });

  it("resumes the stored exercise step instead of restarting at 0", async () => {
    const session = createActiveSession("2026-09-01", "push");
    session.currentStep = 2;
    await saveActiveSession(session);
    getStoreValue.mockResolvedValue(session);

    const reopened = await loadActiveSession();
    expect(reopened?.currentStep).toBe(2);
    expect(clampStep(reopened?.currentStep ?? 0, 6)).toBe(2);
    expect(clampStep(reopened?.currentStep ?? 0, 6)).not.toBe(0);
    expect(reopened?.dayKey).toBe("push");
  });
});
