import { localDateKey } from "@/lib/db/history";
import { decideActiveSessionRestore } from "./activeSession";
import type { BackupFileV1, RestorePreview } from "./types";

export function buildRestorePreview(
  backup: BackupFileV1,
  today = localDateKey(),
): RestorePreview {
  const { data } = backup;
  const dates = collectDates(data);
  dates.sort((a, b) => a.localeCompare(b));

  return {
    exportedAt: backup.exportedAt,
    appVersion: backup.appVersion,
    sessionCount: Object.keys(data.sessions).length,
    exerciseHistoryCount: Object.keys(data.exerciseHistory).length,
    calendarDayCount: Object.keys(data.calendar).length,
    dateRange: {
      earliest: dates[0] ?? null,
      latest: dates[dates.length - 1] ?? null,
    },
    programIncluded: data.program != null,
    activeSession: decideActiveSessionRestore(
      data.activeSession,
      data.calendar,
      today,
    ),
  };
}

function collectDates(data: BackupFileV1["data"]): string[] {
  const dates = new Set<string>();
  for (const date of Object.keys(data.calendar)) dates.add(date);
  for (const date of Object.keys(data.sessions)) dates.add(date);
  for (const date of Object.keys(data.soreness)) dates.add(date);
  for (const entries of Object.values(data.exerciseHistory)) {
    for (const entry of entries) dates.add(entry.date);
  }
  if (data.activeSession?.date) dates.add(data.activeSession.date);
  return [...dates];
}
