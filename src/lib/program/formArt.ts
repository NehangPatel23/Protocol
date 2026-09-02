import { poseForExercise } from "./formPoses";
import type { MuscleGroup } from "./types";

/**
 * Shared écorché art key for start/finish stills.
 * Similar lifts (e.g. standing curl vs hammer curl) share a plate when
 * the movement and highlighted muscles match.
 */
const ART_BY_ID: Record<string, string> = {
  "push-ups": "push-up",
  "iso-incline-decline-press": "incline-press",
  "iso-flat-bench-press": "flat-press",
  "chest-press-machine": "chest-press",
  "pectoral-fly-machine": "chest-fly",
  "decline-db-raises": "decline-fly",
  "overhead-db-press": "ohp",
  "tricep-pushdown": "tricep-pushdown",
  "reverse-tricep-pushdown": "tricep-pushdown",
  "tricep-press-machine": "tricep-press",
  deadlift: "deadlift",
  "row-cable": "seated-row",
  "seated-vhandle-chest-pull": "seated-row",
  "wide-grip-lat-pulldown": "lat-pulldown",
  "single-pulley-bar-pulldown": "lat-pulldown",
  "weighted-assisted-pullups": "pull-up",
  "thigh-supported-back-extension": "back-extension",
  "angled-db-pulls": "bent-row",
  "standing-db-curl": "db-curl",
  "hammer-curl": "db-curl",
  "cable-bar-curl": "db-curl",
  "machine-biceps-curl": "db-curl",
  "preacher-curl": "preacher-curl",
  "seated-incline-db-curl": "incline-curl",
  "db-reverse-curl": "reverse-curl",
  "db-cross-body-curl": "cross-body-curl",
  "db-behind-head-curl": "db-curl",
  "bodyweight-squats": "squat",
  "weighted-squat": "barbell-squat",
  "seated-leg-press": "leg-press",
  "leg-extension": "leg-extension",
  "one-legged-platform-climb": "step-up",
  "calf-raise-machine": "calf-raise",
  "calf-extension-machine": "seated-calf",
  "shoulder-press-machine": "shoulder-press",
  "db-side-front-raises": "lateral-raise",
  "db-shoulder-shrugs": "shrug",
  lunges: "lunge",
  "seated-leg-curl": "seated-leg-curl",
  "lying-standing-leg-curl": "lying-leg-curl",
  "glute-machine": "glute-kick",
  "ab-curls-pull": "crunch",
  "ab-curls-upper": "crunch",
  "leg-raises-pull": "leg-raise",
  "leg-raises-upper": "leg-raise",
};

const ART_BY_ICON: Record<string, string> = {
  pushup: "push-up",
  ohp: "ohp",
  tricep: "tricep-pushdown",
  deadlift: "deadlift",
  row: "seated-row",
  pulldown: "lat-pulldown",
  pullup: "pull-up",
  curl: "db-curl",
  squat: "squat",
  lunge: "lunge",
  legpress: "leg-press",
  legcurl: "lying-leg-curl",
};

export function formArtKey(exerciseId: string, icon: string | null): string {
  if (ART_BY_ID[exerciseId]) return ART_BY_ID[exerciseId];
  if (icon && ART_BY_ICON[icon]) return ART_BY_ICON[icon];
  return "push-up";
}

export function formPlate(exerciseId: string, icon: string | null, primary: MuscleGroup[]) {
  const pose = poseForExercise(exerciseId, icon, primary);
  return {
    art: formArtKey(exerciseId, icon),
    labels: pose.labels,
  };
}
