import { getDB, getStoreValue, setStoreValue } from "./index";
import { mergeSessionRecord, type CardioLog, type SessionRecord } from "./cardio";
import type { DayKey } from "@/lib/program/types";

export async function loadSession(
  date: string,
): Promise<SessionRecord | undefined> {
  return getStoreValue<SessionRecord>("sessions", date);
}

export async function loadAllSessions(): Promise<Record<string, SessionRecord>> {
  const db = await getDB();
  const keys = await db.getAllKeys("sessions");
  const values = await db.getAll("sessions");
  const sessions: Record<string, SessionRecord> = {};
  keys.forEach((key, i) => {
    const value = values[i];
    if (value && typeof value === "object") {
      sessions[String(key)] = value as SessionRecord;
    }
  });
  return sessions;
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
  const next = mergeSessionRecord(existing, {
    date,
    dayKey,
    cardio,
    durationMin: cardio.durationMin,
    complete: existing?.complete ?? false,
  });
  await saveSession(next);
  return next;
}
