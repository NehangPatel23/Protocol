/**
 * Per-exercise logged sets — Master Prompt §5 `history` shape.
 * Active Session (Phase 2) should write this same store so detail + history agree.
 */

import { deleteStoreValue, getDB, setStoreValue } from "./index";
import type { DayKey } from "@/lib/program/types";

export interface HistorySet {
  id: string;
  weightKg: number;
  reps: number;
  rpe?: number;
  toFailure?: boolean;
  loggedAt: string;
}

export interface HistoryEntry {
  date: string;
  dayKey?: DayKey;
  sets: HistorySet[];
}

export function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatHistoryDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  if (!y || !m || !d) return dateKey;
  return `${y.slice(2)}.${m}.${d}`;
}

export function newSetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function appendSet(
  entries: HistoryEntry[],
  set: HistorySet,
  date: string,
  dayKey?: DayKey,
): HistoryEntry[] {
  const next = entries.map((entry) => ({
    ...entry,
    sets: [...entry.sets],
  }));
  const existing = next.find((e) => e.date === date);
  if (existing) {
    existing.sets.push(set);
    return next;
  }
  next.push({ date, dayKey, sets: [set] });
  next.sort((a, b) => b.date.localeCompare(a.date));
  return next;
}

export function removeSet(
  entries: HistoryEntry[],
  setId: string,
): HistoryEntry[] {
  return entries
    .map((entry) => ({
      ...entry,
      sets: entry.sets.filter((s) => s.id !== setId),
    }))
    .filter((entry) => entry.sets.length > 0);
}

export async function loadAllHistory(): Promise<Record<string, HistoryEntry[]>> {
  const db = await getDB();
  const keys = await db.getAllKeys("exerciseHistory");
  const values = await db.getAll("exerciseHistory");
  const history: Record<string, HistoryEntry[]> = {};
  keys.forEach((key, i) => {
    const value = values[i];
    if (Array.isArray(value)) history[String(key)] = value as HistoryEntry[];
  });
  return history;
}

export async function saveExerciseHistory(
  exerciseId: string,
  entries: HistoryEntry[],
): Promise<void> {
  if (entries.length === 0) {
    await deleteStoreValue("exerciseHistory", exerciseId);
    return;
  }
  await setStoreValue("exerciseHistory", exerciseId, entries);
}
