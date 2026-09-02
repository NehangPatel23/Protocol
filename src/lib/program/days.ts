import type { LucideIcon } from "lucide-react";
import {
  ChevronsDown,
  ChevronsUp,
  Dumbbell,
  Footprints,
  Moon,
  PersonStanding,
} from "lucide-react";
import { DAYS, type DayKey } from "./types";

export const DAY_KEYS: DayKey[] = [
  "push",
  "pull",
  "legs",
  "rest",
  "upper",
  "lower",
];

/** Full 7-day sequence including both Rest slots (PPL–Rest–UL–Rest). */
export const CYCLE_DAYS: DayKey[] = DAYS.map((d) => d.key);

export const DAY_LABELS: Record<DayKey, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  rest: "Rest",
  upper: "Upper",
  lower: "Lower",
};

export const DAY_SUBTITLES: Record<DayKey, string> = Object.fromEntries(
  DAYS.filter((d, i, arr) => arr.findIndex((x) => x.key === d.key) === i).map(
    (d) => [d.key, d.subtitle],
  ),
) as Record<DayKey, string>;

/** Distinct icon per day — Design Spec §10 (color is never the only signal). */
export const DAY_ICONS: Record<DayKey, LucideIcon> = {
  push: ChevronsUp,
  pull: ChevronsDown,
  legs: Footprints,
  rest: Moon,
  upper: Dumbbell,
  lower: PersonStanding,
};

export const DAY_CHIP: Record<
  DayKey,
  { border: string; text: string; bg: string; dot: string; fill: string }
> = {
  push: {
    border: "border-day-push-fg",
    text: "text-day-push-fg",
    bg: "bg-day-push/25",
    dot: "bg-day-push-fg",
    fill: "fill-day-push-fg",
  },
  pull: {
    border: "border-day-pull-fg",
    text: "text-day-pull-fg",
    bg: "bg-day-pull/25",
    dot: "bg-day-pull-fg",
    fill: "fill-day-pull-fg",
  },
  legs: {
    border: "border-day-legs-fg",
    text: "text-day-legs-fg",
    bg: "bg-day-legs/25",
    dot: "bg-day-legs-fg",
    fill: "fill-day-legs-fg",
  },
  rest: {
    border: "border-day-rest-fg",
    text: "text-day-rest-fg",
    bg: "bg-day-rest/25",
    dot: "bg-day-rest-fg",
    fill: "fill-day-rest-fg",
  },
  upper: {
    border: "border-day-upper-fg",
    text: "text-day-upper-fg",
    bg: "bg-day-upper/25",
    dot: "bg-day-upper-fg",
    fill: "fill-day-upper-fg",
  },
  lower: {
    border: "border-day-lower-fg",
    text: "text-day-lower-fg",
    bg: "bg-day-lower/25",
    dot: "bg-day-lower-fg",
    fill: "fill-day-lower-fg",
  },
};

export function isDayKey(value: string | undefined | null): value is DayKey {
  return (
    value === "push" ||
    value === "pull" ||
    value === "legs" ||
    value === "rest" ||
    value === "upper" ||
    value === "lower"
  );
}

/**
 * Program tab day when opened from nav (no `?day=`) follows the cycle pointer.
 * A valid `?day=` query still wins.
 */
export function resolveProgramDay(
  dayFromUrl: string | undefined,
  cycleOrder: readonly DayKey[],
  pointerIndex: number,
): DayKey {
  if (isDayKey(dayFromUrl)) return dayFromUrl;
  return cycleOrder[pointerIndex] ?? cycleOrder[0] ?? "push";
}
