/** Shared cardio log shape — Master Prompt §2.3 / §2.8 / §5. */

import type { DistanceUnit } from "./schema";
import type { DayKey } from "@/lib/program/types";

export type SpeedUnit = "mph" | "km/h";

export function speedUnitFromDistance(distance: DistanceUnit): SpeedUnit {
  return distance === "mi" ? "mph" : "km/h";
}

export interface CardioLog {
  activity: string;
  durationMin: number;
  distance: number | null;
  distanceUnit: DistanceUnit;
  /** Treadmill / walk-run grade. */
  inclinePct: number | null;
  /** Pace on the machine or path. */
  speed: number | null;
  speedUnit: SpeedUnit;
  /** Bike / elliptical resistance setting (dimensionless machine level). */
  resistanceLevel: number | null;
  avgHrBpm: number | null;
  notes: string | null;
  loggedAt: string;
}

export function formatCardioSummary(log: CardioLog): string {
  const parts: string[] = [`${log.durationMin} min`];
  if (log.distance != null) {
    parts.push(`${formatNum(log.distance)} ${log.distanceUnit}`);
  }
  if (log.speed != null) {
    parts.push(`${formatNum(log.speed)} ${log.speedUnit}`);
  }
  if (log.inclinePct != null) {
    parts.push(`${formatNum(log.inclinePct)}% incline`);
  }
  if (log.resistanceLevel != null) {
    parts.push(`lvl ${formatNum(log.resistanceLevel)}`);
  }
  if (log.avgHrBpm != null) {
    parts.push(`${Math.round(log.avgHrBpm)} bpm`);
  }
  return parts.join(" · ");
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

/** Master Prompt §5 `soreness` store. */
export interface SorenessRecord {
  markedSore: true;
  originalDayKey: DayKey;
  cardioLogged: CardioLog | null;
  reversedSameDay: boolean;
}

/** Master Prompt §5 `sessions` store — cardio field used by program finishers. */
export interface SessionRecord {
  date: string;
  dayKey: DayKey;
  type: "program" | "adhoc";
  entries: unknown[];
  cardio: CardioLog | null;
  durationMin?: number;
  notes?: string;
  complete: boolean;
}
