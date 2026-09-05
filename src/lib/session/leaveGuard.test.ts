import { afterEach, describe, expect, it, vi } from "vitest";
import {
  installSessionBackGuard,
  SESSION_LEAVE_PROMPT,
} from "./leaveGuard";

describe("installSessionBackGuard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prompts on popstate and re-pushes history so the session view stays", () => {
    const onPrompt = vi.fn();
    const pushState = vi.spyOn(window.history, "pushState");
    const dispose = installSessionBackGuard({
      onPrompt,
      isConfirmed: () => false,
    });

    expect(pushState).toHaveBeenCalledWith(
      { protocolSessionGuard: true },
      "",
    );
    const callsAfterInstall = pushState.mock.calls.length;

    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(onPrompt).toHaveBeenCalledTimes(1);
    expect(pushState.mock.calls.length).toBe(callsAfterInstall + 1);
    expect(SESSION_LEAVE_PROMPT).toBe(
      "Leave this workout? Your progress is saved.",
    );

    dispose();
  });

  it("does not prompt after the user confirms leave", () => {
    const onPrompt = vi.fn();
    let confirmed = false;
    const dispose = installSessionBackGuard({
      onPrompt,
      isConfirmed: () => confirmed,
    });

    confirmed = true;
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(onPrompt).not.toHaveBeenCalled();
    dispose();
  });

  it("does not clear any session record — it only prompts", () => {
    const onPrompt = vi.fn();
    const dispose = installSessionBackGuard({
      onPrompt,
      isConfirmed: () => false,
    });
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(onPrompt).toHaveBeenCalledTimes(1);
    dispose();
  });
});
