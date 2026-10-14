/**
 * Recompute derived stores after restore — same rules as ProgramProvider boot
 * (PRs via bestPRFromHistory + loadType guard) and Progress badge merge.
 */

import type { HistoryEntry } from "@/lib/db/history";
import { persistBadges } from "@/lib/db/badges";
import { savePR } from "@/lib/db/prs";
import type { StoreWrite } from "@/lib/db/index";
import type { CalendarEntry } from "@/lib/program/cycle";
import type { ProgramRecord } from "@/lib/program/types";
import {
  computeBadges,
  mergeBadges,
  type Badge,
} from "@/lib/progress/badges";
import {
  bestPRFromHistory,
  warmupPrescriptionFor,
  type PersonalRecord,
} from "@/lib/progress/prs";

export interface ReconcileResult {
  prs: Record<string, PersonalRecord>;
  badges: Badge[];
}

/** Pure recompute — no I/O. */
export function computeReconciledDerived(
  history: Record<string, HistoryEntry[]>,
  calendar: Record<string, CalendarEntry>,
  program: ProgramRecord,
  today: string,
): ReconcileResult {
  const prs: Record<string, PersonalRecord> = {};
  for (const exerciseId of Object.keys(history)) {
    const lib = program.exercises[exerciseId];
    const nextPR = bestPRFromHistory(
      history[exerciseId] ?? [],
      lib?.prType ?? "weight",
      warmupPrescriptionFor(program, exerciseId),
      lib?.loadType,
    );
    if (nextPR) prs[exerciseId] = nextPR;
  }

  const badges = mergeBadges(
    computeBadges(history, calendar, program, today),
    [],
  );

  return { prs, badges };
}

/** Persist recomputed PRs and badges (separate from the restore transaction). */
export async function persistReconciledDerived(
  result: ReconcileResult,
  options?: {
    savePR?: typeof savePR;
    persistBadges?: typeof persistBadges;
  },
): Promise<void> {
  const save = options?.savePR ?? savePR;
  const saveBadges = options?.persistBadges ?? persistBadges;

  for (const [exerciseId, record] of Object.entries(result.prs)) {
    await save(exerciseId, record);
  }
  if (result.badges.length > 0) {
    await saveBadges(result.badges);
  }
}

/** Build put writes for derived stores (for tests that want one atomic commit). */
export function derivedStoreWrites(result: ReconcileResult): StoreWrite[] {
  const writes: StoreWrite[] = [];
  for (const [exerciseId, record] of Object.entries(result.prs)) {
    writes.push({ op: "put", store: "prs", key: exerciseId, value: record });
  }
  for (const badge of result.badges) {
    writes.push({ op: "put", store: "badges", key: badge.id, value: badge });
  }
  return writes;
}
