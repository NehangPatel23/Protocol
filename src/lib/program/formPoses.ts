import type { MuscleGroup } from "./types";

export type FormView = "front" | "side";

export type FormGear =
  | "none"
  | "barbell"
  | "dumbbells"
  | "bench"
  | "incline-bench"
  | "decline-bench"
  | "cable"
  | "pullup-bar"
  | "hyperextension"
  | "leg-press"
  | "preacher"
  | "machine"
  | "fly-machine"
  | "step";

/** Degrees. 0 hang / standing; see poseForExercise for per-exercise values. */
export interface Joints {
  tilt: number;
  spine: number;
  shoulderL: number;
  shoulderR: number;
  elbowL: number;
  elbowR: number;
  hipL: number;
  hipR: number;
  kneeL: number;
  kneeR: number;
  ox?: number;
  oy?: number;
  scale?: number;
}

export interface FormPose {
  view: FormView;
  labels: { start: string; finish: string };
  gear: FormGear;
  start: Joints;
  finish: Joints;
}

const SIDE: Joints = {
  tilt: 0,
  spine: 6,
  shoulderL: 18,
  shoulderR: 14,
  elbowL: 12,
  elbowR: 10,
  hipL: 8,
  hipR: 10,
  kneeL: 8,
  kneeR: 10,
  ox: 80,
  oy: 124,
  scale: 1,
};

const FRONT: Joints = {
  tilt: 0,
  spine: 0,
  shoulderL: 10,
  shoulderR: 10,
  elbowL: 12,
  elbowR: 12,
  hipL: 5,
  hipR: 5,
  kneeL: 6,
  kneeR: 6,
  ox: 80,
  oy: 124,
  scale: 1,
};

function P(
  view: FormView,
  startLabel: string,
  finishLabel: string,
  gear: FormGear,
  start: Partial<Joints>,
  finish: Partial<Joints>,
): FormPose {
  const base = view === "front" ? FRONT : SIDE;
  return {
    view,
    labels: { start: startLabel, finish: finishLabel },
    gear,
    start: { ...base, ...start },
    finish: { ...base, ...finish },
  };
}

/** Fallback when a new exercise has no dedicated pose yet — Master Prompt §2.2a. */
const BY_ICON: Record<string, FormPose> = {
  pushup: P(
    "side", "Bottom", "Lockout", "none",
    { tilt: 88, spine: 0, shoulderL: 8, elbowL: 92, hipL: 4, kneeL: 4, oy: 108, scale: 0.92 },
    { tilt: 88, spine: 0, shoulderL: 8, elbowL: 8, hipL: 4, kneeL: 4, oy: 108, scale: 0.92 },
  ),
  ohp: P(
    "front", "Racked", "Overhead", "dumbbells",
    { shoulderL: 70, shoulderR: 70, elbowL: 95, elbowR: 95 },
    { shoulderL: 168, shoulderR: 168, elbowL: 8, elbowR: 8 },
  ),
  tricep: P(
    "side", "Bent", "Extend", "cable",
    { shoulderL: 8, elbowL: 100 },
    { shoulderL: 8, elbowL: 8 },
  ),
  deadlift: P(
    "side", "Floor", "Lockout", "barbell",
    { spine: 52, hipL: 72, hipR: 70, kneeL: 55, kneeR: 52, shoulderL: 8, elbowL: 8, oy: 118 },
    { spine: 0, hipL: 4, kneeL: 4, shoulderL: 8, elbowL: 6 },
  ),
  row: P(
    "side", "Reach", "Squeeze", "cable",
    { spine: 8, shoulderL: 78, elbowL: 18, hipL: 82, kneeL: 78, oy: 130 },
    { spine: 8, shoulderL: 42, elbowL: 95, hipL: 82, kneeL: 78, oy: 130 },
  ),
  pulldown: P(
    "front", "Reach", "To chest", "cable",
    { shoulderL: 172, shoulderR: 172, elbowL: 8, elbowR: 8, hipL: 78, hipR: 78, kneeL: 82, kneeR: 82, oy: 132 },
    { shoulderL: 118, shoulderR: 118, elbowL: 92, elbowR: 92, hipL: 78, hipR: 78, kneeL: 82, kneeR: 82, oy: 132 },
  ),
  pullup: P(
    "front", "Hang", "Chin over", "pullup-bar",
    { shoulderL: 175, shoulderR: 175, elbowL: 6, elbowR: 6, oy: 118, scale: 0.92 },
    { shoulderL: 125, shoulderR: 125, elbowL: 108, elbowR: 108, oy: 132, scale: 0.92 },
  ),
  curl: P(
    "front", "Hang", "Peak", "dumbbells",
    { elbowL: 12, elbowR: 12 },
    { elbowL: 138, elbowR: 138 },
  ),
  squat: P(
    "side", "Stand", "Depth", "none",
    { spine: 4, hipL: 6, kneeL: 6, shoulderL: 85, elbowL: 70 },
    { spine: 28, hipL: 88, hipR: 86, kneeL: 92, kneeR: 90, shoulderL: 85, elbowL: 70, oy: 128 },
  ),
  lunge: P(
    "side", "Stand", "Split", "none",
    { hipL: 6, hipR: 6, kneeL: 6, kneeR: 6 },
    { hipL: 78, hipR: 18, kneeL: 88, kneeR: 92, spine: 6, oy: 126 },
  ),
  legpress: P(
    "side", "Bent", "Press", "leg-press",
    { tilt: 12, hipL: 95, hipR: 95, kneeL: 100, kneeR: 100, shoulderL: 70, elbowL: 80, oy: 128 },
    { tilt: 12, hipL: 28, hipR: 28, kneeL: 12, kneeR: 12, shoulderL: 70, elbowL: 80, oy: 128 },
  ),
  legcurl: P(
    "side", "Extend", "Curl", "machine",
    { tilt: 88, spine: 0, hipL: 6, kneeL: 8, shoulderL: 160, elbowL: 40, oy: 112, scale: 0.9 },
    { tilt: 88, spine: 0, hipL: 6, kneeL: 118, shoulderL: 160, elbowL: 40, oy: 112, scale: 0.9 },
  ),
};

const BY_MUSCLE: Record<MuscleGroup, FormPose> = {
  chest: BY_ICON.pushup,
  shoulders: BY_ICON.ohp,
  triceps: BY_ICON.tricep,
  back: BY_ICON.row,
  biceps: BY_ICON.curl,
  quads: BY_ICON.squat,
  hamstrings: BY_ICON.legcurl,
  glutes: BY_ICON.lunge,
  calves: P("side", "Drop", "Rise", "machine", { hipL: 4, kneeL: 4, spine: 0, oy: 128 }, { hipL: 4, kneeL: 4, spine: 0, oy: 116 }),
  core: P("side", "Long", "Crunch", "none", { spine: 8, hipL: 92, kneeL: 88, oy: 132 }, { spine: 55, hipL: 92, kneeL: 88, oy: 132 }),
  forearms: BY_ICON.curl,
};

export const EXERCISE_POSES: Record<string, FormPose> = {
  "push-ups": P(
    "side", "Bottom", "Lockout", "none",
    { tilt: 88, spine: 0, shoulderL: 10, elbowL: 95, hipL: 2, kneeL: 4, oy: 106, scale: 0.9 },
    { tilt: 88, spine: 0, shoulderL: 10, elbowL: 6, hipL: 2, kneeL: 4, oy: 106, scale: 0.9 },
  ),
  "iso-incline-decline-press": P(
    "side", "Chest", "Press", "incline-bench",
    { tilt: -28, spine: 4, shoulderL: 70, elbowL: 100, hipL: 55, kneeL: 70, oy: 128, scale: 0.92 },
    { tilt: -28, spine: 4, shoulderL: 100, elbowL: 8, hipL: 55, kneeL: 70, oy: 128, scale: 0.92 },
  ),
  "iso-flat-bench-press": P(
    "side", "Chest", "Press", "bench",
    { tilt: -88, spine: 0, shoulderL: 8, elbowL: 95, hipL: 4, kneeL: 70, oy: 118, scale: 0.9 },
    { tilt: -88, spine: 0, shoulderL: 8, elbowL: 8, hipL: 4, kneeL: 70, oy: 118, scale: 0.9 },
  ),
  "chest-press-machine": P(
    "front", "Bent", "Press", "machine",
    { shoulderL: 72, shoulderR: 72, elbowL: 100, elbowR: 100, hipL: 80, hipR: 80, kneeL: 85, kneeR: 85, oy: 132 },
    { shoulderL: 88, shoulderR: 88, elbowL: 12, elbowR: 12, hipL: 80, hipR: 80, kneeL: 85, kneeR: 85, oy: 132 },
  ),
  "pectoral-fly-machine": P(
    "front", "Open", "Hug", "fly-machine",
    { shoulderL: 88, shoulderR: 88, elbowL: 55, elbowR: 55, hipL: 80, hipR: 80, kneeL: 85, kneeR: 85, oy: 132 },
    { shoulderL: 28, shoulderR: 28, elbowL: 70, elbowR: 70, hipL: 80, hipR: 80, kneeL: 85, kneeR: 85, oy: 132 },
  ),
  "decline-db-raises": P(
    "side", "Open", "Raise", "decline-bench",
    { tilt: 28, spine: 0, shoulderL: 10, elbowL: 20, hipL: 40, kneeL: 70, oy: 124, scale: 0.92 },
    { tilt: 28, spine: 0, shoulderL: 95, elbowL: 18, hipL: 40, kneeL: 70, oy: 124, scale: 0.92 },
  ),
  "overhead-db-press": P(
    "front", "Racked", "Overhead", "dumbbells",
    { shoulderL: 68, shoulderR: 68, elbowL: 98, elbowR: 98 },
    { shoulderL: 170, shoulderR: 170, elbowL: 6, elbowR: 6 },
  ),
  "tricep-pushdown": P(
    "side", "Bent", "Extend", "cable",
    { spine: 6, shoulderL: 6, elbowL: 108 },
    { spine: 6, shoulderL: 6, elbowL: 6 },
  ),
  "tricep-press-machine": P(
    "front", "Bent", "Press", "machine",
    { shoulderL: 22, shoulderR: 22, elbowL: 118, elbowR: 118, hipL: 80, hipR: 80, kneeL: 85, kneeR: 85, oy: 132 },
    { shoulderL: 22, shoulderR: 22, elbowL: 18, elbowR: 18, hipL: 80, hipR: 80, kneeL: 85, kneeR: 85, oy: 132 },
  ),
  "reverse-tricep-pushdown": P(
    "side", "Bent", "Extend", "cable",
    { spine: 4, shoulderL: 4, elbowL: 112 },
    { spine: 4, shoulderL: 4, elbowL: 8 },
  ),
  deadlift: P(
    "side", "Floor", "Lockout", "barbell",
    { spine: 48, hipL: 78, hipR: 76, kneeL: 58, kneeR: 56, shoulderL: 6, elbowL: 6, oy: 120 },
    { spine: 0, hipL: 2, kneeL: 2, shoulderL: 6, elbowL: 4 },
  ),
  "row-cable": P(
    "side", "Reach", "Squeeze", "cable",
    { spine: 10, shoulderL: 82, elbowL: 16, hipL: 86, kneeL: 80, oy: 132 },
    { spine: 8, shoulderL: 38, elbowL: 100, hipL: 86, kneeL: 80, oy: 132 },
  ),
  "wide-grip-lat-pulldown": P(
    "front", "Wide reach", "To chest", "cable",
    { shoulderL: 176, shoulderR: 176, elbowL: 6, elbowR: 6, hipL: 78, hipR: 78, kneeL: 84, kneeR: 84, oy: 134 },
    { shoulderL: 112, shoulderR: 112, elbowL: 98, elbowR: 98, hipL: 78, hipR: 78, kneeL: 84, kneeR: 84, oy: 134 },
  ),
  "weighted-assisted-pullups": P(
    "front", "Hang", "Chin over", "pullup-bar",
    { shoulderL: 176, shoulderR: 176, elbowL: 4, elbowR: 4, oy: 116, scale: 0.9 },
    { shoulderL: 122, shoulderR: 122, elbowL: 112, elbowR: 112, oy: 134, scale: 0.9 },
  ),
  "seated-vhandle-chest-pull": P(
    "side", "Reach", "To ribs", "cable",
    { spine: 6, shoulderL: 88, elbowL: 22, hipL: 86, kneeL: 82, oy: 132 },
    { spine: 4, shoulderL: 28, elbowL: 108, hipL: 86, kneeL: 82, oy: 132 },
  ),
  "single-pulley-bar-pulldown": P(
    "front", "Reach", "To chest", "cable",
    { shoulderL: 170, shoulderR: 170, elbowL: 8, elbowR: 8, hipL: 80, hipR: 80, kneeL: 84, kneeR: 84, oy: 134 },
    { shoulderL: 125, shoulderR: 125, elbowL: 88, elbowR: 88, hipL: 80, hipR: 80, kneeL: 84, kneeR: 84, oy: 134 },
  ),
  "thigh-supported-back-extension": P(
    "side", "Fold", "Extend", "hyperextension",
    { tilt: 48, spine: 78, hipL: 4, kneeL: 8, shoulderL: 155, elbowL: 22, oy: 122, scale: 0.88 },
    { tilt: 48, spine: -12, hipL: 4, kneeL: 8, shoulderL: 155, elbowL: 22, oy: 122, scale: 0.88 },
  ),
  "angled-db-pulls": P(
    "side", "Hang", "Row", "dumbbells",
    { spine: 62, hipL: 48, kneeL: 18, shoulderL: 8, elbowL: 12, oy: 122 },
    { spine: 58, hipL: 48, kneeL: 18, shoulderL: 8, elbowL: 108, oy: 122 },
  ),
  "standing-db-curl": P(
    "front", "Hang", "Peak", "dumbbells",
    { elbowL: 10, elbowR: 10 },
    { elbowL: 140, elbowR: 140 },
  ),
  "hammer-curl": P(
    "front", "Hang", "Peak", "dumbbells",
    { elbowL: 8, elbowR: 8, shoulderL: 6, shoulderR: 6 },
    { elbowL: 132, elbowR: 132, shoulderL: 6, shoulderR: 6 },
  ),
  "bodyweight-squats": P(
    "side", "Stand", "Depth", "none",
    { spine: 4, hipL: 6, kneeL: 6, shoulderL: 80, elbowL: 90 },
    { spine: 26, hipL: 90, hipR: 88, kneeL: 95, kneeR: 92, shoulderL: 80, elbowL: 90, oy: 128 },
  ),
  "weighted-squat": P(
    "side", "Stand", "Depth", "barbell",
    { spine: 6, hipL: 6, kneeL: 6, shoulderL: 95, elbowL: 85 },
    { spine: 32, hipL: 92, hipR: 90, kneeL: 96, kneeR: 94, shoulderL: 95, elbowL: 85, oy: 128 },
  ),
  "seated-leg-press": P(
    "side", "Bent", "Press", "leg-press",
    { tilt: 18, spine: 6, hipL: 100, hipR: 100, kneeL: 105, kneeR: 105, shoulderL: 60, elbowL: 85, oy: 130 },
    { tilt: 18, spine: 6, hipL: 22, hipR: 22, kneeL: 10, kneeR: 10, shoulderL: 60, elbowL: 85, oy: 130 },
  ),
  "leg-extension": P(
    "side", "Bent", "Kick", "machine",
    { spine: 4, hipL: 82, hipR: 82, kneeL: 95, kneeR: 95, shoulderL: 8, oy: 132 },
    { spine: 4, hipL: 82, hipR: 82, kneeL: 6, kneeR: 6, shoulderL: 8, oy: 132 },
  ),
  "one-legged-platform-climb": P(
    "side", "Step", "Drive", "step",
    { hipL: 72, hipR: 8, kneeL: 78, kneeR: 8, spine: 8, shoulderL: 40, oy: 124 },
    { hipL: 8, hipR: 55, kneeL: 8, kneeR: 70, spine: 4, shoulderL: 30, oy: 118 },
  ),
  "calf-raise-machine": P(
    "side", "Drop", "Rise", "machine",
    { hipL: 4, kneeL: 4, spine: 0, shoulderL: 160, elbowL: 40, oy: 128 },
    { hipL: 4, kneeL: 4, spine: 0, shoulderL: 160, elbowL: 40, oy: 116 },
  ),
  "shoulder-press-machine": P(
    "front", "Racked", "Press", "machine",
    { shoulderL: 62, shoulderR: 62, elbowL: 100, elbowR: 100, hipL: 80, hipR: 80, kneeL: 84, kneeR: 84, oy: 132 },
    { shoulderL: 165, shoulderR: 165, elbowL: 10, elbowR: 10, hipL: 80, hipR: 80, kneeL: 84, kneeR: 84, oy: 132 },
  ),
  "db-side-front-raises": P(
    "front", "Hang", "Raise", "dumbbells",
    { shoulderL: 8, shoulderR: 8, elbowL: 12, elbowR: 12 },
    { shoulderL: 92, shoulderR: 92, elbowL: 10, elbowR: 10 },
  ),
  "db-shoulder-shrugs": P(
    "front", "Hang", "Shrug", "dumbbells",
    { shoulderL: 8, shoulderR: 8, spine: 0, oy: 126 },
    { shoulderL: 8, shoulderR: 8, spine: -6, oy: 118 },
  ),
  "seated-incline-db-curl": P(
    "side", "Hang", "Peak", "incline-bench",
    { tilt: -24, spine: 2, shoulderL: 8, elbowL: 12, hipL: 50, kneeL: 72, oy: 128 },
    { tilt: -24, spine: 2, shoulderL: 8, elbowL: 138, hipL: 50, kneeL: 72, oy: 128 },
  ),
  "db-reverse-curl": P(
    "front", "Hang", "Peak", "dumbbells",
    { elbowL: 10, elbowR: 10, shoulderL: 6, shoulderR: 6 },
    { elbowL: 128, elbowR: 128, shoulderL: 6, shoulderR: 6 },
  ),
  "db-cross-body-curl": P(
    "front", "Hang", "Across", "dumbbells",
    { elbowL: 10, elbowR: 10, shoulderL: 8, shoulderR: 18 },
    { elbowL: 10, elbowR: 145, shoulderL: 8, shoulderR: 42 },
  ),
  "db-behind-head-curl": P(
    "side", "Hang", "Drag", "dumbbells",
    { spine: 4, shoulderL: -8, elbowL: 14 },
    { spine: 4, shoulderL: -8, elbowL: 130 },
  ),
  "cable-bar-curl": P(
    "front", "Hang", "Peak", "cable",
    { elbowL: 12, elbowR: 12, shoulderL: 6, shoulderR: 6 },
    { elbowL: 136, elbowR: 136, shoulderL: 6, shoulderR: 6 },
  ),
  "machine-biceps-curl": P(
    "side", "Extend", "Curl", "machine",
    { hipL: 82, kneeL: 82, spine: 4, shoulderL: 18, elbowL: 12, oy: 132 },
    { hipL: 82, kneeL: 82, spine: 4, shoulderL: 18, elbowL: 132, oy: 132 },
  ),
  "preacher-curl": P(
    "side", "Extend", "Curl", "preacher",
    { hipL: 78, kneeL: 80, spine: 8, shoulderL: 28, elbowL: 16, oy: 130 },
    { hipL: 78, kneeL: 80, spine: 8, shoulderL: 28, elbowL: 128, oy: 130 },
  ),
  lunges: P(
    "side", "Stand", "Split", "none",
    { hipL: 6, hipR: 6, kneeL: 6, kneeR: 6, shoulderL: 70, elbowL: 80 },
    { hipL: 82, hipR: 16, kneeL: 90, kneeR: 95, spine: 6, shoulderL: 70, elbowL: 80, oy: 126 },
  ),
  "seated-leg-curl": P(
    "side", "Open", "Curl", "machine",
    { hipL: 84, hipR: 84, kneeL: 8, kneeR: 8, spine: 4, shoulderL: 8, oy: 132 },
    { hipL: 84, hipR: 84, kneeL: 112, kneeR: 112, spine: 4, shoulderL: 8, oy: 132 },
  ),
  "lying-standing-leg-curl": P(
    "side", "Long", "Curl", "machine",
    { tilt: 88, spine: 0, hipL: 4, kneeL: 6, shoulderL: 160, elbowL: 30, oy: 110, scale: 0.88 },
    { tilt: 88, spine: 0, hipL: 4, kneeL: 120, shoulderL: 160, elbowL: 30, oy: 110, scale: 0.88 },
  ),
  "glute-machine": P(
    "side", "Fold", "Kick", "machine",
    { spine: 18, hipL: 70, hipR: 8, kneeL: 80, kneeR: 8, oy: 126 },
    { spine: 10, hipL: 8, hipR: 8, kneeL: 20, kneeR: 8, oy: 126 },
  ),
  "calf-extension-machine": P(
    "side", "Flex", "Extend", "machine",
    { hipL: 80, kneeL: 80, spine: 4, shoulderL: 8, oy: 132 },
    { hipL: 80, kneeL: 80, spine: 4, shoulderL: 8, oy: 128 },
  ),
  "ab-curls-pull": P(
    "side", "Long", "Crunch", "none",
    { spine: 10, hipL: 90, kneeL: 88, shoulderL: 40, oy: 132 },
    { spine: 58, hipL: 90, kneeL: 88, shoulderL: 50, oy: 132 },
  ),
  "ab-curls-upper": P(
    "side", "Long", "Crunch", "none",
    { spine: 10, hipL: 90, kneeL: 88, shoulderL: 40, oy: 132 },
    { spine: 58, hipL: 90, kneeL: 88, shoulderL: 50, oy: 132 },
  ),
  "leg-raises-pull": P(
    "side", "Hang", "Raise", "none",
    { spine: 4, hipL: 8, kneeL: 8, shoulderL: 170, elbowL: 10, oy: 118 },
    { spine: 4, hipL: 88, kneeL: 12, shoulderL: 170, elbowL: 10, oy: 118 },
  ),
  "leg-raises-upper": P(
    "side", "Hang", "Raise", "none",
    { spine: 4, hipL: 8, kneeL: 8, shoulderL: 170, elbowL: 10, oy: 118 },
    { spine: 4, hipL: 88, kneeL: 12, shoulderL: 170, elbowL: 10, oy: 118 },
  ),
};

export function poseForExercise(
  exerciseId: string,
  icon: string | null,
  primary: MuscleGroup[],
): FormPose {
  if (EXERCISE_POSES[exerciseId]) return EXERCISE_POSES[exerciseId];
  if (icon && BY_ICON[icon]) return BY_ICON[icon];
  const muscle = primary[0];
  if (muscle && BY_MUSCLE[muscle]) return BY_MUSCLE[muscle];
  return BY_ICON.pushup;
}
