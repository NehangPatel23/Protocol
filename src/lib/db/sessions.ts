import { getStoreValue, setStoreValue } from "./index";
import type { CardioLog, SessionRecord } from "./cardio";
import type { DayKey } from "@/lib/program/types";

export async function loadSession(
  date: string,
): Promise<SessionRecord | undefined> {
  return getStoreValue<SessionRecord>("sessions", date);
}

export async function saveSession(record: SessionRecord): Promise<void> {
  await setStoreValue("sessions", record.date, record);
}

/** Merge a cardio finisher onto today's program session (creates a stub if needed). */
export async function upsertSessionCardio(
  date: string,
  dayKey: DayKey,
  cardio: CardioLog,
): Promise<SessionRecord> {
  const existing = await loadSession(date);
  const next: SessionRecord = existing
    ? { ...existing, cardio, durationMin: cardio.durationMin }
    : {
        date,
        dayKey,
        type: "program",
        entries: [],
        cardio,
        durationMin: cardio.durationMin,
        complete: false,
      };
  await saveSession(next);
  return next;
}
