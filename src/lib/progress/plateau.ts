/**
 * Plateau detector — Master Prompt §6.4.
 * Flags a lift with no session-to-session progress across ~4 consecutive
 * working sessions. Suppressed while prefs.pauseMode is in an active window.
 * There is no per-session deload flag in stored history.
 */

import type { HistoryEntry } from "@/lib/db/history";
import type { Prefs } from "@/lib/db/schema";
import type { PRType, ProgramRecord } from "@/lib/program/types";
import {
  beats,
  bestPRFromHistory,
  warmupPrescriptionFor,
  weightsEqualKg,
  type PersonalRecord,
  type WarmupPrescription,
} from "./prs";
import { isWorkingSet } from "./volume";

export const PLATEAU_SESSION_COUNT = 4;

export function isPauseWindowActive(
  pauseMode: Prefs["pauseMode"],
  today: string,
): boolean {
  if (!pauseMode.active) return false;
  if (pauseMode.until != null && today > pauseMode.until) return false;
  return true;
}

function workingSessions(
  entries: HistoryEntry[],
  warmup: WarmupPrescription | undefined,
  today: string,
): HistoryEntry[] {
  return [...entries]
    .filter((entry) => entry.date <= today)
    .filter((entry) => entry.sets.some((s) => isWorkingSet(s, warmup)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function bestOfSession(
  entry: HistoryEntry,
  prType: PRType,
  warmup: WarmupPrescription | undefined,
): PersonalRecord | null {
  return bestPRFromHistory([entry], prType, warmup);
}

function isSessionProgress(
  next: { weightKg: number; reps: number; date: string },
  current: PersonalRecord,
  prType: PRType,
): boolean {
  if (beats(next, current, prType)) return true;
  // More reps at the same (or heavier) load is progress even when Epley
  // refuses to compare a ≤12 set to a >12 set.
  if (prType === "weight") {
    const sameOrHeavier =
      next.weightKg > current.weightKg ||
      weightsEqualKg(next.weightKg, current.weightKg);
    if (sameOrHeavier && next.reps > current.reps) return true;
  }
  return false;
}

function sessionProgressed(
  current: HistoryEntry,
  previous: HistoryEntry,
  prType: PRType,
  warmup: WarmupPrescription | undefined,
): boolean {
  const prevBest = bestOfSession(previous, prType, warmup);
  if (!prevBest) return true;
  for (const set of current.sets) {
    if (!isWorkingSet(set, warmup)) continue;
    if (
      isSessionProgress(
        { weightKg: set.weightKg, reps: set.reps, date: current.date },
        prevBest,
        prType,
      )
    ) {
      return true;
    }
  }
  return false;
}

export interface PlateauFlag {
  exerciseId: string;
  name: string;
  sessionDates: string[];
  stalledBest: PersonalRecord | null;
}

export function detectPlateaus(
  history: Record<string, HistoryEntry[]>,
  program: ProgramRecord,
  today: string,
  pauseMode: Prefs["pauseMode"] = { active: false, until: null },
): PlateauFlag[] {
  if (isPauseWindowActive(pauseMode, today)) return [];

  const flags: PlateauFlag[] = [];
  for (const [exerciseId, entries] of Object.entries(history)) {
    const lib = program.exercises[exerciseId];
    if (!lib) continue;
    const warmup = warmupPrescriptionFor(program, exerciseId);
    const sessions = workingSessions(entries, warmup, today);
    if (sessions.length < PLATEAU_SESSION_COUNT) continue;
    const window = sessions.slice(-PLATEAU_SESSION_COUNT);
    let progressed = false;
    for (let i = 1; i < window.length; i++) {
      if (sessionProgressed(window[i], window[i - 1], lib.prType, warmup)) {
        progressed = true;
        break;
      }
    }
    if (progressed) continue;
    flags.push({
      exerciseId,
      name: lib.name,
      sessionDates: window.map((e) => e.date),
      stalledBest: bestOfSession(window[window.length - 1], lib.prType, warmup),
    });
  }
  flags.sort((a, b) => a.name.localeCompare(b.name));
  return flags;
}
