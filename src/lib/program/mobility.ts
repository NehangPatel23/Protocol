import { daysBetween } from "./cycle";
import type { MuscleGroup } from "./types";

export interface MobilityTip {
  text: string;
  image: "tip-1" | "tip-2";
}

export interface MobilityExtraForm {
  label: string;
  slot: "hang";
  caption: string;
}

export interface MobilitySuggestion {
  id: string;
  title: string;
  why: string;
  how: string;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  formLabels: { start: string; finish: string };
  /** Cue under the start and finish figures, when those poses need their own tip. */
  formCaptions?: { start: string; finish: string };
  /** A third position that is not a start/finish pair, such as the dead hang. */
  extraForm?: MobilityExtraForm;
  tips: MobilityTip[];
}

export function mobilityArt(
  id: string,
  slot: "start" | "finish" | "hang" | "tip-1" | "tip-2",
): string {
  return `/anatomy/mobility/${id}-${slot}.webp`;
}

function drill(
  id: string,
  title: string,
  why: string,
  how: string,
  primary: MuscleGroup[],
  secondary: MuscleGroup[],
  start: string,
  finish: string,
  tip1?: string,
  tip2?: string,
  extraForm?: MobilityExtraForm,
  formCaptions?: { start: string; finish: string },
): MobilitySuggestion {
  const tips: MobilityTip[] = [];
  if (tip1) tips.push({ text: tip1, image: "tip-1" });
  if (tip2) tips.push({ text: tip2, image: "tip-2" });
  return {
    id,
    title,
    why,
    how,
    primary,
    secondary,
    formLabels: { start, finish },
    formCaptions,
    extraForm,
    tips,
  };
}

const BY_MUSCLE: Record<MuscleGroup, MobilitySuggestion> = {
  chest: drill(
    "doorway-pec",
    "Doorway pec stretch",
    "Opens the front of the shoulder after pressing.",
    "Forearm on the doorframe, step through until you feel a chest stretch. 30s each side.",
    ["chest"],
    ["shoulders"],
    "Setup",
    "Open",
    "Keep the elbow level with the shoulder. A dropped elbow turns this into a shrug.",
    "Step the front foot through, and keep that shoulder down away from the ear.",
  ),
  shoulders: drill(
    "pass-through",
    "Band (or towel) pass-throughs",
    "Restores overhead range after pressing or raises.",
    "Wide grip, sweep from hips to behind you without shrugging. 8 slow reps.",
    ["shoulders"],
    ["chest"],
    "At hips",
    "Behind",
    "Ribs stay down. Don’t lean back just to get the band overhead.",
    "If it won’t reach behind you, take a wider grip instead of bending the elbows.",
  ),
  triceps: drill(
    "overhead-triceps",
    "Overhead triceps stretch",
    "Unloads the elbow after isolation work.",
    "Elbow to the ceiling, other hand eases it back. 30s each side.",
    ["triceps"],
    ["shoulders"],
    "Elbow up",
    "Ease back",
    "Point the elbow at the ceiling, close to the ear, not out to the side.",
    "The other hand only eases the elbow back. Don’t yank it.",
  ),
  back: drill(
    "cat-cow",
    "Cat-cow + hanging",
    "Undoes the flexed-spine pulling pattern.",
    "8 slow cat-cows, then a 20–30s dead hang if a bar is handy.",
    ["back"],
    ["core"],
    "Cat",
    "Cow",
    undefined,
    undefined,
    {
      label: "Hang",
      slot: "hang",
      caption: "For the hang, arms straight and shoulders away from the ears, ribs down.",
    },
    {
      start: "Start the round at the tailbone and let it travel up. Don’t just nod the chin.",
      finish: "Drop the belly and open the chest from the tailbone. Keep the neck long — don’t crank the chin up.",
    },
  ),
  biceps: drill(
    "wall-bicep",
    "Wall bicep stretch",
    "Lengthens the elbow flexors after curls.",
    "Palm on the wall, fingers down, turn away until the biceps tugs. 30s each side.",
    ["biceps"],
    ["forearms"],
    "Palm down",
    "Turn away",
    "Fingers point down and the elbow stays nearly straight.",
    "Turn the chest and the feet away together so the stretch stays in the biceps.",
  ),
  quads: drill(
    "couch-stretch",
    "Couch stretch",
    "Opens the hip flexors after squats and lunges.",
    "Back knee at the wall or couch, upright torso. 45s each side.",
    ["quads"],
    ["glutes"],
    "Kneel",
    "Upright",
    "Back knee close to the wall or couch. Gently squeeze that glute.",
    "Ribs stay stacked over the pelvis. Leaning back only fakes the stretch.",
  ),
  hamstrings: drill(
    "hamstring-stretch",
    "Elevated hamstring stretch",
    "Feeds length back after hinging.",
    "Heel on a bench, hinge with a flat back. 30s each side.",
    ["hamstrings"],
    ["calves"],
    "Heel up",
    "Hinge",
    "Hinge at the hips with a flat back. Rounding the spine misses the hamstring.",
    "Keep a soft knee if the back of the knee is what complains.",
  ),
  glutes: drill(
    "figure-four",
    "Figure-four on the floor",
    "Unwinds the hips after posterior-chain work.",
    "Ankle on opposite knee, pull the thigh in. 30s each side.",
    ["glutes"],
    ["hamstrings"],
    "Ankle on",
    "Pull in",
    "Flex the foot of the crossed leg so the knee stays comfortable.",
    "Pull the thigh in, not the knee, and keep the head down.",
  ),
  calves: drill(
    "calf-stretch",
    "Wall calf stretch",
    "Calves stay short after stepping and pressing.",
    "Straight back leg, heel down, 30s; then a bent-knee version for the soleus.",
    ["calves"],
    [],
    "Straight",
    "Bent knee",
    "Heel stays on the floor. If it lifts, step that foot closer to the wall.",
    "Toes point straight ahead, not out to the side.",
  ),
  core: drill(
    "dead-bug",
    "Dead bug breathing",
    "Resets the trunk without more flexion crunching.",
    "Opposite arm/leg reach, exhale fully. 6 slow reps each side.",
    ["core"],
    [],
    "Start",
    "Reach",
    "Exhale and keep the low back gently on the floor the whole time.",
    "Reach long. Don’t arch the back just to get the leg lower.",
  ),
  forearms: drill(
    "wrist-stretch",
    "Wrist flexor / extensor stretch",
    "Grip work leaves the forearms tight.",
    "Arm straight, pull fingers back, then down. 20s each way.",
    ["forearms"],
    [],
    "Fingers back",
    "Fingers down",
    "The stretching elbow stays straight. A bent elbow cheats the stretch.",
    "Pull from the fingers. Don’t twist the torso to crank the wrist.",
  ),
};

/**
 * Primary muscles from `exerciseHistory` in the trailing window, most
 * recently trained first. Empty when nothing was logged — callers pass
 * this straight into `mobilityForMuscles`, which already falls back to
 * back / chest / quads.
 */
export function recentMusclesFromHistory(
  history: Record<string, Array<{ date: string }>>,
  primaryMusclesOf: (exerciseId: string) => MuscleGroup[] | undefined,
  today: string,
  windowDays = 7,
): MuscleGroup[] {
  const last: Partial<Record<MuscleGroup, string>> = {};
  for (const [id, entries] of Object.entries(history)) {
    const muscles = primaryMusclesOf(id);
    if (!muscles?.length) continue;
    for (const entry of entries) {
      if (entry.date > today) continue;
      if (daysBetween(entry.date, today) > windowDays) continue;
      for (const m of muscles) {
        if (!last[m] || entry.date > last[m]!) last[m] = entry.date;
      }
    }
  }
  return (Object.entries(last) as [MuscleGroup, string][])
    .sort((a, b) => b[1].localeCompare(a[1]) || a[0].localeCompare(b[0]))
    .map(([muscle]) => muscle);
}

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
