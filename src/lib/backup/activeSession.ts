import type { ActiveSessionState } from "@/lib/db/activeSession";
import type { CalendarEntry } from "@/lib/program/cycle";
import type { ActiveSessionRestoreDecision } from "./types";

/**
 * Restore activeSession only when the file's session is for today and
 * calendar[today] is not completed. Otherwise discard (or none).
 */
export function decideActiveSessionRestore(
  session: ActiveSessionState | null | undefined,
  calendar: Record<string, CalendarEntry>,
  today: string,
): ActiveSessionRestoreDecision {
  if (session == null) {
    return {
      action: "none",
      reason: "No active session was included in this backup.",
    };
  }
  if (session.date !== today) {
    return {
      action: "discard",
      reason: `Active session is for ${session.date}, not today (${today}), so it will be discarded.`,
    };
  }
  if (calendar[today]?.status === "completed") {
    return {
      action: "discard",
      reason: `Today (${today}) is already marked completed in the backup, so the active session will be discarded.`,
    };
  }
  return {
    action: "restore",
    reason: `Active session for today (${today}) will be restored.`,
  };
}
