import { epley1RM } from "@/lib/program/format";
import type { PRType } from "@/lib/program/types";
import type { HistorySet } from "@/lib/db/history";

/** Same scheme string Exercise Detail's history table uses. */
export function setScheme(sets: HistorySet[]): string {
  const reps = sets.map((s) => s.reps);
  if (reps.length === 0) return "—";
  if (reps.every((r) => r === reps[0])) return `${sets.length} × ${reps[0]}`;
  return reps.join(" / ");
}

export function topLoadKg(sets: HistorySet[], prType: PRType): number {
  const weights = sets.map((s) => s.weightKg);
  if (weights.length === 0) return 0;
  if (prType === "inverse-weight") return Math.min(...weights);
  return Math.max(...weights);
}

export function bestEst1RM(sets: HistorySet[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    const est = epley1RM(s.weightKg, s.reps);
    if (est == null) continue;
    if (best === null || est > best) best = est;
  }
  return best;
}
