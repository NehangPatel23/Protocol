/**
 * Achievement badges — Master Prompt §6.8.
 * Eligibility is recomputed from full history/calendar, not tracked
 * forward from first install, so existing logs earn badges on first visit.
 */

import type { HistoryEntry } from "@/lib/db/history";
import { addLocalDays } from "@/lib/program/cycle";
import type { CalendarEntry } from "@/lib/program/cycle";
import type { ProgramRecord } from "@/lib/program/types";
import { buildPRWall } from "./view";

export const BADGE_IDS = [
  "first-pr",
  "ten-sessions",
  "four-week-streak",
] as const;

export type BadgeId = (typeof BADGE_IDS)[number];

export interface Badge {
  id: BadgeId;
  earnedDate: string;
}

export const BADGE_COPY: Record<
  BadgeId,
  { title: string; description: string }
> = {
  "first-pr": {
    title: "First PR",
    description: "Logged an all-time best on a working set",
  },
  "ten-sessions": {
    title: "10 sessions",
    description: "Completed or recovered on 10 different days",
  },
  "four-week-streak": {
    title: "4-week streak",
    description: "Showed up at least once in four trailing weeks",
  },
};

const STREAK_WEEKS = 4;
const WEEK_DAYS = 7;
const TEN_SESSIONS = 10;

export function isShowUpStatus(
  status: CalendarEntry["status"] | undefined,
): boolean {
  return status === "completed" || status === "recovery" || status === "adhoc";
}

export function showUpDates(
  calendar: Record<string, CalendarEntry>,
): string[] {
  return Object.entries(calendar)
    .filter(([, entry]) => isShowUpStatus(entry.status))
    .map(([date]) => date)
    .sort((a, b) => a.localeCompare(b));
}

function firstPrDate(
  history: Record<string, HistoryEntry[]>,
  program: ProgramRecord,
): string | null {
  const wall = buildPRWall(history, program);
  if (wall.length === 0) return null;
  return wall.reduce(
    (earliest, item) =>
      item.record.date < earliest ? item.record.date : earliest,
    wall[0].record.date,
  );
}

function weekHasShowUp(
  dates: Set<string>,
  start: string,
  end: string,
): boolean {
  for (const date of dates) {
    if (date >= start && date <= end) return true;
  }
  return false;
}

/**
 * Four consecutive trailing-7-day windows ending on `asOf`, each with a show-up.
 */
export function hasFourWeekStreakOn(
  calendar: Record<string, CalendarEntry>,
  asOf: string,
): boolean {
  const dates = new Set(showUpDates(calendar));
  for (let i = 0; i < STREAK_WEEKS; i++) {
    const end = addLocalDays(asOf, -i * WEEK_DAYS);
    const start = addLocalDays(end, -(WEEK_DAYS - 1));
    if (!weekHasShowUp(dates, start, end)) return false;
  }
  return true;
}

function earliestFourWeekStreakDate(
  calendar: Record<string, CalendarEntry>,
  today: string,
): string | null {
  const dates = showUpDates(calendar);
  if (dates.length === 0) return null;
  const first = dates[0];
  const minAsOf = addLocalDays(first, (STREAK_WEEKS - 1) * WEEK_DAYS);
  if (minAsOf > today) return null;
  for (
    let asOf = minAsOf;
    asOf <= today;
    asOf = addLocalDays(asOf, 1)
  ) {
    if (hasFourWeekStreakOn(calendar, asOf)) return asOf;
  }
  return null;
}

export function computeBadges(
  history: Record<string, HistoryEntry[]>,
  calendar: Record<string, CalendarEntry>,
  program: ProgramRecord,
  today: string,
): Badge[] {
  const earned: Badge[] = [];
  const prDate = firstPrDate(history, program);
  if (prDate) earned.push({ id: "first-pr", earnedDate: prDate });

  const sessions = showUpDates(calendar).filter((d) => d <= today);
  if (sessions.length >= TEN_SESSIONS) {
    earned.push({ id: "ten-sessions", earnedDate: sessions[TEN_SESSIONS - 1] });
  }

  const streakDate = earliestFourWeekStreakDate(calendar, today);
  if (streakDate) {
    earned.push({ id: "four-week-streak", earnedDate: streakDate });
  }

  return earned;
}

/**
 * Union computed + stored. Keep the earlier earnedDate so a later recompute
 * doesn't "re-earn" a badge on today.
 */
export function mergeBadges(computed: Badge[], stored: Badge[]): Badge[] {
  const byId = new Map<BadgeId, Badge>();
  for (const badge of stored) {
    if (!BADGE_IDS.includes(badge.id)) continue;
    byId.set(badge.id, badge);
  }
  for (const badge of computed) {
    const existing = byId.get(badge.id);
    if (!existing || badge.earnedDate < existing.earnedDate) {
      byId.set(badge.id, badge);
    }
  }
  return BADGE_IDS.map((id) => byId.get(id)).filter(
    (b): b is Badge => b != null,
  );
}

export function newlyEarned(merged: Badge[], stored: Badge[]): Badge[] {
  const storedIds = new Set(stored.map((b) => b.id));
  return merged.filter((b) => !storedIds.has(b.id));
}
