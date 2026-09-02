import type { WeightUnit } from "@/lib/db/schema";
import { MUSCLE_LABELS, type MuscleGroup, type WeightRange } from "./types";

/** Round to nearest 0.5 — Master Prompt §6.9. */
export function roundGym(n: number): number {
  return Math.round(n * 2) / 2;
}

export function kgToDisplay(kg: number, units: WeightUnit): number {
  if (units === "kg") return roundGym(kg);
  return roundGym(kg * 2.2046226218);
}

export function displayToKg(value: number, units: WeightUnit): number {
  if (units === "kg") return value;
  return value / 2.2046226218;
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

export function unitLabel(units: WeightUnit): string {
  return units === "kg" ? "kg" : "lb";
}

export function formatWeightValue(
  weight: WeightRange | "bodyweight",
  units: WeightUnit,
): string {
  if (weight === "bodyweight") return "BW";
  const values = units === "kg" ? weight.kg : weight.lb;
  if (!values.length) return "—";
  if (values.length === 1) return `${formatNum(values[0])} ${unitLabel(units)}`;
  const first = values[0];
  const last = values[values.length - 1];
  return `${formatNum(first)}–${formatNum(last)} ${unitLabel(units)}`;
}

export function formatPrescription(
  sets: number | string,
  reps: string,
  weight: WeightRange | "bodyweight",
  units: WeightUnit,
): string {
  return `${sets} × ${reps} @ ${formatWeightValue(weight, units)}`;
}

export function muscleTagList(groups: MuscleGroup[]): string {
  return groups.map((g) => MUSCLE_LABELS[g]).join(", ");
}

export function muscleBracket(groups: MuscleGroup[]): string {
  return `[${groups.map((g) => MUSCLE_LABELS[g]).join(" / ")}]`;
}

/**
 * Leading or last numeric rep count for 1RM. Ranges like "12-15" return null
 * (Epley is unreliable / ambiguous). "10 per leg" → 10. "15 / 15 / 12" → 12.
 */
export function parseRepsFor1RM(reps: string): number | null {
  const trimmed = reps.trim();
  const perLeg = trimmed.match(/^(\d+)\s*per leg/i);
  if (perLeg) return Number(perLeg[1]);
  if (/^\d+\s*[-–]\s*\d+$/.test(trimmed)) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const parts = trimmed.split("/").map((p) => p.trim());
  if (parts.length > 1 && parts.every((p) => /^\d+$/.test(p))) {
    return Number(parts[parts.length - 1]);
  }
  const last = trimmed.match(/(\d+)\s*$/);
  return last ? Number(last[1]) : null;
}

export function topPrescribedKg(
  weight: WeightRange | "bodyweight",
): number | null {
  if (weight === "bodyweight") return null;
  if (!weight.kg.length) return null;
  return weight.kg[weight.kg.length - 1];
}

/** First (lightest) value in a set-progression array — default for a fresh log. */
export function firstPrescribedKg(
  weight: WeightRange | "bodyweight",
): number | null {
  if (weight === "bodyweight") return null;
  if (!weight.kg.length) return null;
  return weight.kg[0];
}

/**
 * Epley 1RM. Caps at ≤12 reps (Master Prompt §6.4). 1-rep is the observed max.
 * Returns kg, or null when the formula must not be applied.
 */
export function epley1RM(weightKg: number, reps: number): number | null {
  if (!(weightKg >= 0) || !(reps >= 1)) return null;
  if (reps === 1) return weightKg;
  if (reps > 12) return null;
  return weightKg * (1 + reps / 30);
}

export function youtubeSearchUrl(exerciseName: string): string {
  const q = `${exerciseName} proper form`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

/** Privacy-enhanced embed of a YouTube search for this exercise (§1.1 / §5). */
export function youtubeEmbedUrl(exerciseName: string): string {
  const q = `${exerciseName} proper form`;
  return `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(q)}`;
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  "high-difficulty": "High Difficulty",
  compound: "Compound",
  "form-refresher-priority": "Form Refresher",
  "replaces-barbell-press": "Replaces Barbell Press",
};

export function difficultyLabel(tag: string): string {
  return DIFFICULTY_LABELS[tag] ?? tag.replace(/-/g, " ");
}
