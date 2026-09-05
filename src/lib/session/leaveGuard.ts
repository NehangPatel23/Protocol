/**
 * Browser/gesture back during an active session — Master Prompt §6.14.
 * In-app back uses the same copy; this intercepts history.popstate.
 */

export const SESSION_LEAVE_PROMPT =
  "Leave this workout? Your progress is saved.";

export function installSessionBackGuard(handlers: {
  onPrompt: () => void;
  isConfirmed: () => boolean;
}): () => void {
  if (typeof window === "undefined") return () => {};

  window.history.pushState({ protocolSessionGuard: true }, "");

  const onPop = () => {
    if (handlers.isConfirmed()) return;
    window.history.pushState({ protocolSessionGuard: true }, "");
    handlers.onPrompt();
  };

  window.addEventListener("popstate", onPop);
  return () => {
    window.removeEventListener("popstate", onPop);
  };
}
