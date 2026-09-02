import { getStoreValue, setStoreValue } from "./index";
import type { CalendarEntry, CycleState } from "@/lib/program/cycle";
import type { DayKey } from "@/lib/program/types";

const CYCLE_KEY = "state";

export async function loadCycle(): Promise<CycleState | undefined> {
  return getStoreValue<CycleState>("cycle", CYCLE_KEY);
}

export async function saveCycle(state: CycleState): Promise<void> {
  await setStoreValue("cycle", CYCLE_KEY, state);
}

export async function loadCalendar(): Promise<Record<string, CalendarEntry>> {
  const value = await getStoreValue<Record<string, CalendarEntry>>(
    "calendar",
    "days",
  );
  return value ?? {};
}

export async function saveCalendar(
  calendar: Record<string, CalendarEntry>,
): Promise<void> {
  await setStoreValue("calendar", "days", calendar);
}

/** Never silently rewrite a settled calendar date. */
export function mergeCalendarWrite(
  calendar: Record<string, CalendarEntry>,
  date: string,
  entry: CalendarEntry,
): Record<string, CalendarEntry> {
  if (calendar[date] && calendar[date].status !== "blank") return calendar;
  return { ...calendar, [date]: entry };
}

/** Calendar write that backs "Mark [Day] done". Will not clobber recovery. */
export function markTrainingDayDone(
  calendar: Record<string, CalendarEntry>,
  date: string,
  dayKey: DayKey,
): Record<string, CalendarEntry> {
  return mergeCalendarWrite(calendar, date, { status: "completed", dayKey });
}

/** Calendar write that backs confirming the soreness → recovery swap. */
export function markRecoveryOnCalendar(
  calendar: Record<string, CalendarEntry>,
  date: string,
): Record<string, CalendarEntry> {
  return mergeCalendarWrite(calendar, date, {
    status: "recovery",
    dayKey: "rest",
  });
}

/** Same-day recovery revert only — other statuses stay settled. */
export function clearRecoveryDate(
  calendar: Record<string, CalendarEntry>,
  date: string,
): Record<string, CalendarEntry> {
  if (calendar[date]?.status !== "recovery") return calendar;
  const next = { ...calendar };
  delete next[date];
  return next;
}
