import type { MuscleGroup } from "./types";

export interface MobilitySuggestion {
  title: string;
  why: string;
  how: string;
}

const BY_MUSCLE: Record<MuscleGroup, MobilitySuggestion> = {
  chest: {
    title: "Doorway pec stretch",
    why: "Opens the front of the shoulder after pressing.",
    how: "Forearm on the doorframe, step through until you feel a chest stretch. 30s each side.",
  },
  shoulders: {
    title: "Band (or towel) pass-throughs",
    why: "Restores overhead range after pressing or raises.",
    how: "Wide grip, sweep from hips to behind you without shrugging. 8 slow reps.",
  },
  triceps: {
    title: "Overhead triceps stretch",
    why: "Unloads the elbow after isolation work.",
    how: "Elbow to the ceiling, other hand eases it back. 30s each side.",
  },
  back: {
    title: "Cat-cow + hanging",
    why: "Undoes the flexed-spine pulling pattern.",
    how: "8 slow cat-cows, then a 20–30s dead hang if a bar is handy.",
  },
  biceps: {
    title: "Wall bicep stretch",
    why: "Lengthens the elbow flexors after curls.",
    how: "Palm on the wall, fingers down, turn away until the biceps tugs. 30s each side.",
  },
  quads: {
    title: "Couch stretch",
    why: "Opens the hip flexors after squats and lunges.",
    how: "Back knee at the wall or couch, upright torso. 45s each side.",
  },
  hamstrings: {
    title: "Elevated hamstring stretch",
    why: "Feeds length back after hinging.",
    how: "Heel on a bench, hinge with a flat back. 30s each side.",
  },
  glutes: {
    title: "Figure-four on the floor",
    why: "Unwinds the hips after posterior-chain work.",
    how: "Ankle on opposite knee, pull the thigh in. 30s each side.",
  },
  calves: {
    title: "Wall calf stretch",
    why: "Calves stay short after stepping and pressing.",
    how: "Straight back leg, heel down, 30s; then a bent-knee version for the soleus.",
  },
  core: {
    title: "Dead bug breathing",
    why: "Resets the trunk without more flexion crunching.",
    how: "Opposite arm/leg reach, exhale fully. 6 slow reps each side.",
  },
  forearms: {
    title: "Wrist flexor / extensor stretch",
    why: "Grip work leaves the forearms tight.",
    how: "Arm straight, pull fingers back, then down. 20s each way.",
  },
};

/** Rest-day mobility matched to muscles trained most in the given window. */
export function mobilityForMuscles(
  muscles: MuscleGroup[],
  limit = 3,
): MobilitySuggestion[] {
  const seen = new Set<string>();
  const out: MobilitySuggestion[] = [];
  for (const m of muscles) {
    const s = BY_MUSCLE[m];
    if (!s || seen.has(s.title)) continue;
    seen.add(s.title);
    out.push(s);
    if (out.length >= limit) return out;
  }
  for (const s of [BY_MUSCLE.back, BY_MUSCLE.chest, BY_MUSCLE.quads]) {
    if (out.length >= limit) break;
    if (seen.has(s.title)) continue;
    seen.add(s.title);
    out.push(s);
  }
  return out;
}
