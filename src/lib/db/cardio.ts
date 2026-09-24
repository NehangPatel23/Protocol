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
  /** Cardio finisher length — not workout elapsed time. */
  durationMin?: number;
  notes?: string;
  complete: boolean;
  /** Set by `logChosenDay` — History shows the out-of-sequence banner. */
  outOfSequenceBanner?: true;
  /** Wall-clock from Start Session. Sticky: first write wins. */
  startedAt?: string;
  /** Wall-clock from Finish Workout. */
  finishedAt?: string;
}

/** Merge a sessions-store patch without dropping cardio, timestamps, or the banner. */
export function mergeSessionRecord(
  existing: SessionRecord | undefined,
  patch: Partial<SessionRecord> & Pick<SessionRecord, "date" | "dayKey">,
): SessionRecord {
  const record: SessionRecord = {
    date: patch.date,
    dayKey: patch.dayKey,
    type: patch.type ?? existing?.type ?? "program",
    entries: patch.entries ?? existing?.entries ?? [],
    cardio:
      patch.cardio !== undefined ? patch.cardio : (existing?.cardio ?? null),
    complete: patch.complete ?? existing?.complete ?? false,
  };
  const durationMin = patch.durationMin ?? existing?.durationMin;
  if (typeof durationMin === "number") record.durationMin = durationMin;
  const notes = patch.notes ?? existing?.notes;
  if (notes != null) record.notes = notes;
  const startedAt = existing?.startedAt ?? patch.startedAt;
  if (startedAt) record.startedAt = startedAt;
  const finishedAt = patch.finishedAt ?? existing?.finishedAt;
  if (finishedAt) record.finishedAt = finishedAt;
  if (
    patch.outOfSequenceBanner === true ||
    existing?.outOfSequenceBanner === true
  ) {
    record.outOfSequenceBanner = true;
  }
  return record;
}
