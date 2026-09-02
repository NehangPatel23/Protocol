import type { Highlight, MuscleGroup as AnatomyGroup } from "js-rich-body-highlighter/react";
import type { MuscleGroup } from "./types";

export const ANATOMY_SHORT: Record<MuscleGroup, string> = {
  chest: "CHEST",
  back: "BACK",
  shoulders: "DELTS",
  triceps: "TRI",
  biceps: "BI",
  quads: "QUADS",
  hamstrings: "HAMS",
  glutes: "GLUTES",
  calves: "CALVES",
  core: "CORE",
  forearms: "FORE",
};

/** App muscle buckets → illustration mask groups. */
export const ANATOMY_GROUPS: Record<MuscleGroup, AnatomyGroup[]> = {
  chest: ["chest"],
  back: ["upper_back", "lats", "lower_back"],
  shoulders: ["shoulders"],
  triceps: ["triceps"],
  biceps: ["biceps"],
  quads: ["quads"],
  hamstrings: ["hamstrings"],
  glutes: ["glutes"],
  calves: ["calves"],
  core: ["abs", "obliques"],
  forearms: ["forearms"],
};

export function anatomyHighlights(
  primary: MuscleGroup[],
  secondary: MuscleGroup[],
  color: string,
): Highlight[] {
  const highlights: Highlight[] = [];
  const primarySet = new Set(primary);

  for (const muscle of primary) {
    for (const group of ANATOMY_GROUPS[muscle]) {
      highlights.push({ group, intensity: 86, color });
    }
  }
  for (const muscle of secondary) {
    if (primarySet.has(muscle)) continue;
    for (const group of ANATOMY_GROUPS[muscle]) {
      highlights.push({ group, intensity: 40, color });
    }
  }
  return highlights;
}
