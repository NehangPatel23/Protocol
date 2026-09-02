/** IndexedDB schema + prefs types — Master Prompt §5 / §5.1 */

export const DB_NAME = "protocol";
/** Bump when stores change — v2 ensures all object stores exist after incomplete v1 opens. */
export const DB_VERSION = 2;

export type WeightUnit = "kg" | "lb";
export type DistanceUnit = "km" | "mi";
export type ThemePref = "dark" | "light";

export interface Prefs {
  units: WeightUnit;
  distanceUnits: DistanceUnit;
  theme: ThemePref;
  cycleStartDate: string | null;
  restTimerDefaults: {
    compoundSec: number;
    isolationSec: number;
  };
  voiceGuided: boolean;
  wakeLock: boolean;
  timerSounds: boolean;
  timerVibration: boolean;
  pauseMode: {
    active: boolean;
    until: string | null;
  };
}

/** Defaults — units default to lb per product decision */
export const DEFAULT_PREFS: Prefs = {
  units: "lb",
  distanceUnits: "mi",
  theme: "dark",
  cycleStartDate: null,
  restTimerDefaults: {
    compoundSec: 180,
    isolationSec: 90,
  },
  voiceGuided: false,
  wakeLock: true,
  timerSounds: true,
  timerVibration: true,
  pauseMode: {
    active: false,
    until: null,
  },
};

export type StoreName =
  | "meta"
  | "prefs"
  /** exercises / assignments / cycleOrder — Master Prompt §2.2a; see src/lib/program/types.ts */
  | "program"
  | "sessions"
  | "exerciseHistory"
  | "prs"
  | "badges"
  | "notes"
  | "soreness"
  | "calendar"
  | "cycle"
  | "activeSession";

export const STORE_NAMES: StoreName[] = [
  "meta",
  "prefs",
  "program",
  "sessions",
  "exerciseHistory",
  "prs",
  "badges",
  "notes",
  "soreness",
  "calendar",
  "cycle",
  "activeSession",
];
