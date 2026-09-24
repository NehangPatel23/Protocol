/**
 * Progress read-model. PR Wall is derived from exerciseHistory;
 * the `prs` store is a write-through snapshot updated on log/delete.
 */

import type { HistoryEntry } from "@/lib/db/history";
import type { WeightUnit } from "@/lib/db/schema";
import { kgToDisplay, unitLabel } from "@/lib/program/format";
import type { PRType, ProgramRecord } from "@/lib/program/types";
import {
  bestPRFromHistory,
  warmupPrescriptionFor,
  type PersonalRecord,
} from "./prs";
import { weeklyVolumePerMuscle, type MuscleVolume } from "./volume";

export interface PRWallItem {
  exerciseId: string;
  name: string;
  prType: PRType;
  record: PersonalRecord;
}

export function buildPRWall(
  history: Record<string, HistoryEntry[]>,
  program: ProgramRecord,
): PRWallItem[] {
  const items: PRWallItem[] = [];
  for (const [exerciseId, entries] of Object.entries(history)) {
    const lib = program.exercises[exerciseId];
    const prType: PRType = lib?.prType ?? "weight";
    const warmup = warmupPrescriptionFor(program, exerciseId);
    const record = bestPRFromHistory(entries, prType, warmup);
    if (!record) continue;
    items.push({
      exerciseId,
      name: lib?.name ?? exerciseId,
      prType,
      record,
    });
  }
  items.sort(
    (a, b) =>
      b.record.date.localeCompare(a.record.date) || a.name.localeCompare(b.name),
  );
  return items;
}

export function formatPRDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPRHeadline(
  item: PRWallItem,
  units: WeightUnit,
): string {
  const { prType, record } = item;
  if (prType === "reps") return `${record.reps} reps`;
  const w = kgToDisplay(record.weightKg, units);
  const u = unitLabel(units);
  if (prType === "inverse-weight") return `${w} ${u} assist`;
  if (record.est1RM == null && record.reps > 12) {
    return `${w} ${u} × ${record.reps}`;
  }
  return `${w} ${u}`;
}

export function formatBestSet(
  prType: PRType,
  record: PersonalRecord,
  units: WeightUnit,
): string {
  return formatPRHeadline(
    { exerciseId: "", name: "", prType, record },
    units,
  );
}

export function formatPRCaption(item: PRWallItem): string {
  const { prType, record } = item;
  if (prType === "reps") return formatPRDate(record.date);
  if (prType === "inverse-weight") {
    return `${record.reps} reps · ${formatPRDate(record.date)}`;
  }
  if (record.est1RM == null && record.reps > 12) {
    return `Top-set volume · ${formatPRDate(record.date)}`;
  }
  return `${record.reps} reps · ${formatPRDate(record.date)}`;
}

export function formatSetsPerWeek(sets: number): string {
  const label = Number.isInteger(sets) ? String(sets) : sets.toFixed(1);
  return `${label} sets / wk`;
}

export function volumeShare(row: MuscleVolume, rows: MuscleVolume[]): number {
  const max = Math.max(0, ...rows.map((r) => r.sets));
  if (max <= 0) return 0;
  return row.sets / max;
}

export function weeklyVolumeModel(
  history: Record<string, HistoryEntry[]>,
  program: ProgramRecord,
  today: string,
): MuscleVolume[] {
  return weeklyVolumePerMuscle(history, program, today);
}
