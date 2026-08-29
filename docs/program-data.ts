/**
 * PPL / Upper-Lower Program — Real Exercise Data
 * ------------------------------------------------
 * This is the actual program from the user's real gym log — every exercise,
 * every prescribed set/rep/weight, every form cue and mistake, sourced from
 * their own workout notes and the finalized program docx. This is NOT
 * placeholder/demo data — it should be imported and used as-is.
 *
 * Schema notes for whoever builds against this:
 * - `id` is the stable identifier used everywhere else in the app (history,
 *   PRs, notes) — see Master Prompt §6.4/6.14: renaming `name` must never
 *   change `id`, and program edits must reference exercises by `id`.
 * - `muscles.primary` gets full credit, `muscles.secondary` gets partial
 *   credit (0.5x) in weekly volume-per-muscle calculations — see Master
 *   Prompt §6.4 ("exercises that work more than one muscle group").
 * - `prType` drives PR-detection logic: 'weight' = higher is better (most
 *   exercises), 'reps' = bodyweight movements where max reps is the PR,
 *   'inverse-weight' = assisted machines where LESS weight is harder/better
 *   (see Master Prompt §6.4, the assisted pull-up nuance).
 * - `icon` maps to the 12 hand-built form pictograms (see the docx build) —
 *   exercises without one of the 12 core patterns get `icon: null` and fall
 *   back to a generic placeholder in the UI.
 * - `isSecondSession` flags the lighter Upper/Lower follow-up instances of
 *   an exercise that also appears as a primary Push/Pull/Legs session —
 *   same `id`, so history/PRs aggregate correctly across both (see Master
 *   Prompt §6.11).
 * - `warmup` sets are excluded from PR detection and volume totals but are
 *   still logged (see Master Prompt §6.4).
 */

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'triceps' | 'biceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'forearms';

export type DayKey = 'push' | 'pull' | 'legs' | 'rest' | 'upper' | 'lower';

export type PRType = 'weight' | 'reps' | 'inverse-weight';

export interface WeightRange {
  kg: number[];   // one or more values — a range means "progress through these"
  lb: number[];
}

export interface Exercise {
  id: string;
  name: string;
  day: DayKey;
  isSecondSession?: boolean;       // lighter Upper/Lower follow-up of a primary-day exercise
  muscles: { primary: MuscleGroup[]; secondary?: MuscleGroup[] };
  equipment: string;
  sets: number | string;           // string for irregular schemes like "2 (+1)"
  reps: string;                    // e.g. "15", "3", "10 per leg", "15 / 15 / 12"
  weight: WeightRange | 'bodyweight';
  warmup?: { sets: number; reps: string; weight: WeightRange };
  setup?: string[];
  cues: string[];
  mistakes: string[];
  alternativeId?: string;          // points to another Exercise['id']
  alternativeNote?: string;        // used when the alternative isn't a full exercise (e.g. a combo)
  note?: string;
  difficultyTags?: string[];
  icon: string | null;
  prType: PRType;
  cardioFinisher?: { activity: string; durationMin: number };
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', triceps: 'Triceps',
  biceps: 'Biceps', quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
  calves: 'Calves', core: 'Core', forearms: 'Forearms',
};

export const DAYS: { key: DayKey; label: string; subtitle: string; color: string }[] = [
  { key: 'push',  label: 'Push',  subtitle: 'Chest, Shoulders, Triceps', color: '#1F4E5F' },
  { key: 'pull',  label: 'Pull',  subtitle: 'Back, Biceps',              color: '#6D28D9' },
  { key: 'legs',  label: 'Legs',  subtitle: 'Quads, Calves',             color: '#0F766E' },
  { key: 'rest',  label: 'Rest',  subtitle: 'Recovery',                  color: '#64748B' },
  { key: 'upper', label: 'Upper', subtitle: 'Shoulders/Arms + Chest/Back follow-up', color: '#B45309' },
  { key: 'lower', label: 'Lower', subtitle: 'Hamstrings/Glutes + Quad follow-up',    color: '#BE123C' },
  { key: 'rest',  label: 'Rest',  subtitle: 'Recovery',                  color: '#64748B' },
];

export const EXERCISES: Exercise[] = [

  // ============================= PUSH =============================
  {
    id: 'push-ups', name: 'Push-ups', day: 'push',
    muscles: { primary: ['chest'], secondary: ['shoulders', 'triceps', 'core'] },
    equipment: 'bodyweight', sets: 2, reps: '10', weight: 'bodyweight',
    cues: [
      'Hands slightly wider than shoulders, body in a straight line from head to heels.',
      'Lower until your chest is a few inches from the floor, elbows at roughly 45° from your torso.',
      'Push the floor away rather than just straightening your arms.',
    ],
    mistakes: ['Letting the hips sag or pike up.', 'Flaring elbows straight out to the sides.', 'Only doing a half range of motion.'],
    alternativeId: 'chest-press-machine',
    alternativeNote: 'Chest Press Machine — same pressing pattern with no core/stabilization demand, useful if wrists or shoulders bother you doing push-ups.',
    icon: 'pushup', prType: 'reps',
  },
  {
    id: 'iso-incline-decline-press', name: 'Isolateral Incline/Decline Press', day: 'push',
    muscles: { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
    equipment: 'isolateral machine', sets: 3, reps: '15', weight: { kg: [], lb: [] },
    setup: ['Adjust seat so handles line up with the mid/lower chest at the bottom of the press.'],
    cues: [
      "Press each side independently through a full range — don't let one arm lag or lead.",
      'Drive through a slight arc as if hugging a barrel, not a straight vertical push.',
      'Pause briefly at full extension without locking out hard.',
    ],
    mistakes: ['Shrugging the shoulders up toward the ears during the press.', 'Using momentum by bouncing off the bottom position.', 'Over-arching the lower back — keep it flat against the pad.'],
    alternativeId: 'pectoral-fly-machine',
    note: "This is your direct swap for the barbell chest press since it lets each arm track its own path and removes the balance/stabilization demand.",
    difficultyTags: ['replaces-barbell-press'],
    icon: null, prType: 'weight',
  },
  {
    id: 'iso-flat-bench-press', name: 'Isolateral Flat Bench Press', day: 'push',
    muscles: { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
    equipment: 'isolateral machine', sets: 3, reps: '12', weight: { kg: [], lb: [] },
    cues: [
      'Keep shoulder blades pulled back and down into the pad throughout.',
      'Bar path (or handles) should travel toward the lower chest, not the neck.',
      'Full lockout at the top, controlled 2-3 second lowering.',
    ],
    mistakes: ['Bouncing the handles at the bottom.', 'Flat back losing contact with the pad.', 'Rushing the eccentric (lowering) portion.'],
    alternativeId: 'chest-press-machine',
    icon: null, prType: 'weight',
  },
  {
    id: 'chest-press-machine', name: 'Chest Press Machine', day: 'push',
    muscles: { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
    equipment: 'machine', sets: 3, reps: '15', weight: { kg: [2.5, 5, 7.5], lb: [5.5, 11, 16.5] },
    cues: [
      'Set the seat so handles are level with mid-chest.',
      'Press straight out and squeeze the chest at lockout for a beat.',
      "Control the negative — don't let the weight stack slam.",
    ],
    mistakes: ['Seat set too high or low, turning it into a shoulder press.', 'Locking elbows aggressively at the top.', 'Flaring wrists back — keep them stacked over the elbows.'],
    alternativeId: 'iso-flat-bench-press',
    note: "Use this as your main horizontal press since the barbell version isn't clicking — same muscles, guided path, easier to load safely.",
    difficultyTags: ['replaces-barbell-press'],
    icon: null, prType: 'weight',
  },
  {
    id: 'pectoral-fly-machine', name: 'Pectoral Fly Machine', day: 'push',
    muscles: { primary: ['chest'] },
    equipment: 'machine', sets: 3, reps: '15', weight: { kg: [20, 22.5, 25], lb: [44, 50, 55] },
    cues: [
      'Slight bend in the elbows, maintained throughout.',
      'Bring the handles together in front of the chest, squeezing at the middle.',
      "Control the stretch back out — don't let the pads snap back.",
    ],
    mistakes: ['Bending the elbows more as the set gets harder (turns it into a press).', "Using so much weight you can't control the stretch position.", 'Shrugging shoulders forward instead of keeping them pinned back.'],
    alternativeId: 'decline-db-raises',
    icon: null, prType: 'weight',
  },
  {
    id: 'decline-db-raises', name: 'Decline DB Raises (abs bench)', day: 'push',
    muscles: { primary: ['chest'] },
    equipment: 'dumbbell', sets: 3, reps: '10', weight: { kg: [6], lb: [13] },
    cues: [
      'Lie back on the lowest incline setting so the bench is closest to flat/decline.',
      'Lower dumbbells with control to chest level, press back up in a slight arc.',
      'Keep wrists straight and stacked over elbows.',
    ],
    mistakes: ['Letting elbows flare too wide at the bottom.', 'Arching the lower back off the bench.', 'Using more weight than you can control through the full stretch.'],
    alternativeId: 'pectoral-fly-machine',
    icon: null, prType: 'weight',
  },
  {
    id: 'overhead-db-press', name: 'Overhead Dumbbell Press', day: 'push',
    muscles: { primary: ['shoulders'], secondary: ['triceps'] },
    equipment: 'dumbbell', sets: 3, reps: '15', weight: { kg: [5], lb: [11] },
    cues: [
      'Start with dumbbells at shoulder height, palms facing forward.',
      'Press straight overhead until arms are extended, without arching your lower back.',
      'Lower under control back to shoulder height.',
    ],
    mistakes: ['Excessive lower-back arch to force the weight up.', 'Pressing the dumbbells forward instead of straight up.', 'Flaring elbows too far back at the bottom.'],
    alternativeId: 'shoulder-press-machine',
    icon: 'ohp', prType: 'weight',
  },
  {
    id: 'tricep-pushdown', name: 'Tricep Pushdown', day: 'push',
    muscles: { primary: ['triceps'] },
    equipment: 'cable', sets: 3, reps: '15', weight: { kg: [10, 12, 14], lb: [22, 26, 31] },
    cues: [
      'Elbows pinned to your sides for the entire set.',
      'Push down until arms are fully extended, squeeze triceps briefly.',
      'Let the bar rise only to about elbow height on the way back.',
    ],
    mistakes: ['Letting elbows drift forward or out.', 'Using body weight/leaning to help push the bar down.', 'Not controlling the return, letting the weight stack bang.'],
    alternativeId: 'tricep-press-machine',
    icon: 'tricep', prType: 'weight',
  },
  {
    id: 'tricep-press-machine', name: 'Tricep Press Machine', day: 'push',
    muscles: { primary: ['triceps'] },
    equipment: 'machine', sets: 3, reps: '15', weight: { kg: [35], lb: [77] },
    cues: [
      'Keep upper arms fixed against the pads.',
      'Extend through the forearms only, full lockout without hyperextending the elbows.',
      'Control the return to a full stretch.',
    ],
    mistakes: ['Using shoulders to help drive the movement.', 'Partial range of motion.', 'Slamming the weight stack on the way back.'],
    alternativeId: 'tricep-pushdown',
    icon: null, prType: 'weight',
    cardioFinisher: { activity: 'Incline treadmill walk', durationMin: 15 },
  },

  // ============================= PULL =============================
  {
    id: 'deadlift', name: 'Deadlift', day: 'pull',
    muscles: { primary: ['back', 'glutes', 'hamstrings'], secondary: ['core', 'forearms'] },
    equipment: 'barbell', sets: 5, reps: '3', weight: { kg: [40, 45, 50], lb: [88, 99, 110] },
    warmup: { sets: 3, reps: '10', weight: { kg: [20], lb: [44] } },
    setup: ['Bar over mid-foot, shins close to (almost touching) the bar.', 'Grip just outside your knees, hips down until your shins touch the bar.'],
    cues: [
      'Chest up, back flat/neutral before you even start pulling.',
      'Push the floor away with your legs first, then drive your hips forward to finish — bar stays in contact with your legs the whole way.',
      'Lock out by squeezing glutes, not by leaning back.',
    ],
    mistakes: [
      'Rounding the lower back to start the pull — the single biggest injury risk here.',
      'Letting the bar drift away from your shins/thighs.',
      'Hyperextending (leaning back) at the top instead of standing tall.',
      'Jerking the bar off the floor instead of a smooth, controlled pull.',
    ],
    alternativeNote: 'Thigh-Supported Back Extension + Row combo — a safer substitute on days your lower back feels off, hitting the same posterior chain without spinal loading.',
    note: "If your back rounds before you can pull the weight off the floor, that's a signal to drop the weight, not push through it.",
    difficultyTags: ['high-difficulty', 'compound', 'form-refresher-priority'],
    icon: 'deadlift', prType: 'weight',
  },
  {
    id: 'row-cable', name: 'Row (cable/machine)', day: 'pull',
    muscles: { primary: ['back'], secondary: ['biceps'] },
    equipment: 'cable', sets: 3, reps: '15', weight: { kg: [25], lb: [55] },
    cues: [
      'Chest up, slight lean back from the hips, not the spine rounding.',
      'Pull the handle to your lower ribs/stomach, driving elbows straight back.',
      'Squeeze shoulder blades together at the end range, then control the stretch forward.',
    ],
    mistakes: ['Using momentum — rocking the torso to heave the weight.', 'Shrugging shoulders up toward the ears.', 'Pulling to the chest instead of the lower ribs.'],
    alternativeId: 'angled-db-pulls',
    icon: 'row', prType: 'weight',
  },
  {
    id: 'wide-grip-lat-pulldown', name: 'Wide-Grip Lat Pulldown (long bar)', day: 'pull',
    muscles: { primary: ['back'], secondary: ['biceps'] },
    equipment: 'cable', sets: 3, reps: '15', weight: { kg: [9], lb: [20] },
    cues: [
      'Lean back slightly, keep arms straight on the way down — this is a straight-arm pulldown targeting lats directly.',
      'Pull down and back in an arc, driving through the lats, not the arms.',
      'Control the return to a full overhead stretch.',
    ],
    mistakes: ['Bending the elbows early, turning it into a triceps movement.', 'Using body-swing/momentum instead of controlled lat contraction.', 'Shrugging shoulders up instead of keeping them depressed.'],
    alternativeId: 'weighted-assisted-pullups',
    icon: 'pulldown', prType: 'weight',
  },
  {
    id: 'weighted-assisted-pullups', name: 'Weighted Assisted Pull-ups', day: 'pull',
    muscles: { primary: ['back'], secondary: ['biceps'] },
    equipment: 'assisted pull-up machine', sets: '2 (+1)', reps: '15 / 15 / 12',
    weight: { kg: [26, 28, 31.25], lb: [57, 62, 69] },
    cues: [
      'Full dead-hang at the bottom of every rep.',
      'Pull your chin over the bar leading with your chest, elbows driving down and back.',
      "Lower with control — don't just drop.",
    ],
    mistakes: ['Kipping/swinging the legs to generate momentum.', 'Only doing the top half of the range.', 'Letting the assist weight do all the work — you should feel your lats working.'],
    alternativeId: 'wide-grip-lat-pulldown',
    note: 'More assist weight = easier rep. Progress by lowering the assist over time, not just adding reps.',
    icon: 'pullup', prType: 'inverse-weight',
  },
  {
    id: 'seated-vhandle-chest-pull', name: 'Seated V-Handle Chest Pull (cable row)', day: 'pull',
    muscles: { primary: ['back'], secondary: ['biceps'] },
    equipment: 'cable', sets: 3, reps: '15', weight: { kg: [13], lb: [29] },
    cues: [
      'Feet braced on the footrest, knees slightly bent.',
      'Pull the handle to your torso while keeping your back upright, not rocking forward and back.',
      'Squeeze the shoulder blades together at the finish.',
    ],
    mistakes: ['Using the lower back to rock and heave the weight.', 'Rounding the back at the start of each rep.', 'Letting the shoulders roll forward on the return instead of a controlled stretch.'],
    alternativeId: 'row-cable',
    icon: null, prType: 'weight',
  },
  {
    id: 'single-pulley-bar-pulldown', name: 'Single-Pulley Bar Pulldown (seated, leg support)', day: 'pull',
    muscles: { primary: ['back'] },
    equipment: 'cable', sets: 3, reps: '12', weight: { kg: [13], lb: [29] },
    cues: [
      'Brace your legs against the support so your lower body stays still.',
      'Pull down with control, focusing on the lats initiating the movement.',
      'Let the weight rise slowly on the return for a full stretch.',
    ],
    mistakes: ['Using the legs to push against the support and cheat the weight down.', 'Yanking the handle instead of a smooth pull.', 'Not controlling the eccentric (return) phase.'],
    alternativeId: 'wide-grip-lat-pulldown',
    icon: null, prType: 'weight',
  },
  {
    id: 'thigh-supported-back-extension', name: 'Thigh-Supported Back Extension', day: 'pull',
    muscles: { primary: ['back'], secondary: ['glutes', 'hamstrings'] },
    equipment: 'machine', sets: 3, reps: '15', weight: 'bodyweight',
    cues: [
      'Hinge at the hips, keeping your back flat (not rounded) as you lower.',
      "Rise by squeezing glutes and lower back, stopping around neutral — don't hyperextend past straight.",
      'Control both the up and down phases evenly.',
    ],
    mistakes: ['Rounding the back at the bottom of the movement.', 'Hyperextending past a straight line at the top.', 'Using momentum by bouncing at the bottom.'],
    alternativeId: 'deadlift',
    icon: null, prType: 'reps',
  },
  {
    id: 'angled-db-pulls', name: 'Angled Dumbbell Pulls (bent-over row)', day: 'pull',
    muscles: { primary: ['back'], secondary: ['biceps'] },
    equipment: 'dumbbell', sets: 3, reps: '15', weight: { kg: [6, 8, 10], lb: [13, 18, 22] },
    cues: [
      'Hinge at the hips with a flat back, torso angled roughly 45°.',
      'Pull the dumbbells toward your lower ribs, elbows close to your body.',
      'Squeeze at the top, lower with control.',
    ],
    mistakes: ['Rounding the back to compensate for a heavier weight.', 'Standing too upright (turns it into a shrug, not a row).', 'Using momentum/torso jerk to move the weight.'],
    alternativeId: 'row-cable',
    icon: null, prType: 'weight',
  },
  {
    id: 'standing-db-curl', name: 'Standing DB Curl', day: 'pull',
    muscles: { primary: ['biceps'] },
    equipment: 'dumbbell', sets: 3, reps: '15', weight: { kg: [6, 8, 10], lb: [13, 18, 22] },
    cues: ['Elbows pinned to your sides throughout.', 'Curl up while keeping the upper arm still, squeeze at the top.', 'Lower fully under control.'],
    mistakes: ['Swinging the torso/using momentum to heave the weight up.', 'Letting elbows drift forward as the set fatigues.', 'Only doing partial reps at the top.'],
    alternativeId: 'cable-bar-curl',
    icon: 'curl', prType: 'weight',
  },
  {
    id: 'hammer-curl', name: 'Hammer Curl', day: 'pull',
    muscles: { primary: ['biceps'], secondary: ['forearms'] },
    equipment: 'dumbbell', sets: 3, reps: '15', weight: { kg: [6, 8, 10], lb: [13, 18, 22] },
    cues: ['Palms face each other (neutral grip) the entire rep.', 'Elbows stay at your sides, curl straight up.', 'Control the lowering phase fully.'],
    mistakes: ['Rotating the wrist mid-curl (turns it into a regular curl).', 'Swinging the shoulders to generate momentum.', 'Rushing the eccentric.'],
    alternativeId: 'db-reverse-curl',
    icon: null, prType: 'weight',
  },

  // ============================= LEGS =============================
  {
    id: 'bodyweight-squats', name: 'Bodyweight/Light Squats', day: 'legs',
    muscles: { primary: ['quads'], secondary: ['glutes'] },
    equipment: 'bodyweight', sets: '2-3', reps: '20', weight: 'bodyweight',
    cues: ['Feet shoulder-width, toes slightly turned out.', 'Sit back and down like sitting into a chair, chest stays upright.', "Knees track over your toes — don't let them cave inward."],
    mistakes: ['Knees caving in (valgus collapse).', 'Heels lifting off the floor.', 'Rounding the lower back at the bottom.'],
    alternativeId: 'seated-leg-press',
    icon: 'squat', prType: 'reps',
  },
  {
    id: 'weighted-squat', name: 'Weighted Squat (barbell or V-squat machine)', day: 'legs',
    muscles: { primary: ['quads'], secondary: ['glutes'] },
    equipment: 'barbell / V-squat machine', sets: 3, reps: '10', weight: { kg: [7], lb: [15] },
    setup: ['If barbell: bar sits on the upper traps (not the neck), feet set before unracking.'],
    cues: [
      'Brace your core like you\u2019re about to be punched in the stomach, then descend.',
      'Go to at least parallel (hip crease level with knee), keeping the bar path vertical over mid-foot.',
      'Drive up through your whole foot, not just the toes.',
    ],
    mistakes: ['Bar drifting forward, pulling you onto your toes.', 'Not hitting full depth consistently — half-reps limit muscle growth.', 'Losing core brace and rounding the lower back under load.'],
    alternativeId: 'seated-leg-press',
    difficultyTags: ['high-difficulty', 'compound', 'form-refresher-priority'],
    icon: 'squat', prType: 'weight',
  },
  {
    id: 'seated-leg-press', name: 'Seated Leg Press', day: 'legs',
    muscles: { primary: ['quads'], secondary: ['glutes'] },
    equipment: 'machine', sets: 3, reps: '12', weight: { kg: [50, 60, 70], lb: [110, 132, 154] },
    cues: [
      'Feet shoulder-width on the platform, slightly lower than center.',
      "Lower until knees reach about 90°, don't let your lower back round off the pad.",
      "Press through your heels, don't lock the knees out hard at the top.",
    ],
    mistakes: ['Letting the lower back lift off the pad at the bottom.', 'Locking the knees out aggressively at the top.', 'Placing feet too high or too low without meaning to.'],
    alternativeId: 'weighted-squat',
    icon: 'legpress', prType: 'weight',
  },
  {
    id: 'leg-extension', name: 'Leg Extension', day: 'legs',
    muscles: { primary: ['quads'] },
    equipment: 'machine', sets: 3, reps: '15', weight: { kg: [42.5, 50], lb: [94, 110] },
    cues: [
      "Back flat against the pad, knees aligned with the machine's pivot point.",
      'Extend fully and squeeze the quads at the top for a beat.',
      "Lower with control — don't let the weight stack drop.",
    ],
    mistakes: ['Using momentum by kicking the weight up.', 'Only doing a partial range of motion.', 'Gripping the handles so hard you arch off the seat.'],
    alternativeId: 'seated-leg-press',
    icon: null, prType: 'weight',
  },
  {
    id: 'one-legged-platform-climb', name: 'One-Legged Platform Climb', day: 'legs',
    muscles: { primary: ['quads', 'glutes'] },
    equipment: 'platform', sets: 3, reps: '12', weight: 'bodyweight',
    cues: [
      "Drive up through the working leg's heel, avoid pushing off the trailing foot.",
      'Keep your torso upright rather than leaning forward to generate momentum.',
      'Lower with control back to the start.',
    ],
    mistakes: ['Pushing off the bottom leg to assist the climb.', 'Letting the working knee cave inward.', 'Rushing the descent instead of controlling it.'],
    alternativeId: 'lunges',
    icon: null, prType: 'reps',
  },
  {
    id: 'calf-raise-machine', name: 'Calf Raise Machine', day: 'legs',
    muscles: { primary: ['calves'] },
    equipment: 'machine', sets: 3, reps: '20', weight: { kg: [4.5], lb: [10] },
    cues: [
      'Full stretch at the bottom (heels dropping below the platform edge).',
      'Rise all the way onto your toes, pause and squeeze briefly.',
      "Control the lowering phase — don't just drop.",
    ],
    mistakes: ['Bouncing at the bottom instead of pausing in the stretch.', 'Using a tiny, partial range of motion.', 'Rushing through the set instead of controlling tempo.'],
    alternativeId: 'calf-extension-machine',
    icon: null, prType: 'weight',
    cardioFinisher: { activity: 'Stationary cycling', durationMin: 10 },
  },

  // ============================= UPPER (follow-up) =============================
  {
    id: 'iso-flat-bench-press', name: 'Isolateral Flat Bench Press (2nd weekly chest session)', day: 'upper',
    isSecondSession: true,
    muscles: { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
    equipment: 'isolateral machine', sets: 2, reps: '15', weight: { kg: [], lb: [] },
    cues: [
      'Same technique as Push day — shoulder blades pinned back and down, full lockout, controlled lowering.',
      'Since this is your second chest session of the week, keep it a notch lighter and focus on a clean, full-range pump rather than chasing a heavy top set.',
    ],
    mistakes: ["Trying to match or beat your Push-day weight here — this session exists for extra volume, not a new PR.", 'Bouncing the handles at the bottom.', 'Rushing the eccentric.'],
    alternativeId: 'chest-press-machine',
    note: "This is what actually gets your chest to true 2x/week frequency — without it, chest would only be trained once.",
    icon: null, prType: 'weight',
  },
  {
    id: 'wide-grip-lat-pulldown', name: 'Wide-Grip Lat Pulldown (2nd weekly back session)', day: 'upper',
    isSecondSession: true,
    muscles: { primary: ['back'], secondary: ['biceps'] },
    equipment: 'cable', sets: 2, reps: '15', weight: { kg: [], lb: [] },
    cues: [
      'Same straight-arm technique as Pull day, just lighter — this is a volume top-up, not a max effort set.',
      'Focus on feeling the lats stretch and contract rather than moving maximum weight.',
    ],
    mistakes: ["Loading it as heavy as your Pull-day session — you'll cut into recovery for the next Pull day.", 'Using body-swing to move more weight than you should here.'],
    alternativeId: 'row-cable',
    note: 'This is what gets your back to true 2x/week frequency.',
    icon: 'pulldown', prType: 'weight',
  },
  {
    id: 'shoulder-press-machine', name: 'Shoulder Press Machine', day: 'upper',
    muscles: { primary: ['shoulders'], secondary: ['triceps'] },
    equipment: 'machine', sets: 3, reps: '12', weight: { kg: [7.5], lb: [16.5] },
    cues: ['Seat height so handles start level with your shoulders.', 'Press straight up without arching your lower back off the pad.', 'Lower under control back to shoulder height.'],
    mistakes: ['Arching the back to help push the weight up.', 'Pressing the handles forward instead of straight overhead.', 'Locking elbows out hard at the top.'],
    alternativeId: 'overhead-db-press',
    icon: 'ohp', prType: 'weight',
  },
  {
    id: 'db-side-front-raises', name: 'DB Side & Front Raises', day: 'upper',
    muscles: { primary: ['shoulders'] },
    equipment: 'dumbbell', sets: 3, reps: '15', weight: { kg: [3, 4], lb: [6.5, 9] },
    cues: ['Slight bend in the elbow, raise to shoulder height — no higher.', 'Lead with the elbows, not the hands.', "Lower with control, don't let the weight drop."],
    mistakes: ['Swinging/using momentum to fling the weight up.', 'Raising above shoulder height, which shifts stress to the traps.', 'Shrugging the shoulders up during the raise.'],
    note: 'Cable lateral raise, if that station is ever available — otherwise this is your best option as-is.',
    icon: null, prType: 'weight',
  },
  {
    id: 'db-shoulder-shrugs', name: 'DB Shoulder Shrugs', day: 'upper',
    muscles: { primary: ['back'] }, // trapezius bucketed under back for simplicity
    equipment: 'dumbbell', sets: 3, reps: '15', weight: { kg: [16], lb: [35] },
    cues: ['Arms straight, dumbbells at your sides.', 'Raise your shoulders straight up toward your ears, squeeze at the top.', "Lower with control, don't just drop."],
    mistakes: ['Rolling the shoulders in a circle instead of a straight up-down path.', 'Using momentum/bouncing instead of a controlled squeeze.', 'Bending the elbows to help lift the weight.'],
    note: 'Row with an extra top-of-rep shoulder-blade squeeze — partial overlap, not a full substitute, but works in a pinch.',
    icon: null, prType: 'weight',
  },
  {
    id: 'seated-incline-db-curl', name: 'Seated Incline DB Curl', day: 'upper',
    muscles: { primary: ['biceps'] },
    equipment: 'dumbbell', sets: 3, reps: '15', weight: { kg: [6, 8, 10], lb: [13, 18, 22] },
    cues: ['Sit back fully on the incline bench, arms hanging straight down.', "Curl without letting your elbows drift forward.", 'Get a full stretch at the bottom of every rep.'],
    mistakes: ['Elbows drifting forward as the set gets hard.', 'Not achieving a full stretch at the bottom.', 'Rushing the lowering phase.'],
    alternativeId: 'standing-db-curl',
    icon: null, prType: 'weight',
  },
  {
    id: 'db-reverse-curl', name: 'DB Reverse Curl', day: 'upper',
    muscles: { primary: ['forearms'], secondary: ['biceps'] },
    equipment: 'dumbbell', sets: 3, reps: '10', weight: { kg: [8], lb: [17.5] },
    cues: ['Palms face down (overhand grip) throughout.', 'Curl with elbows pinned at your sides, focusing on the forearms/brachialis.', 'Lower fully under control.'],
    mistakes: ['Rotating the wrist mid-rep.', "Using much lighter weight than you'd expect for a regular curl — that's normal with this grip, don't force heavier loads.", 'Swinging the torso for momentum.'],
    alternativeId: 'hammer-curl',
    icon: null, prType: 'weight',
  },
  {
    id: 'db-cross-body-curl', name: 'DB Cross-Body Curl', day: 'upper',
    muscles: { primary: ['biceps'] },
    equipment: 'dumbbell', sets: 3, reps: '10', weight: { kg: [8], lb: [17.5] },
    cues: ['Curl the dumbbell diagonally up toward the opposite shoulder.', 'Keep the elbow relatively fixed at your side.', 'Lower with control back to the start.'],
    mistakes: ['Swinging the dumbbell across instead of a controlled diagonal path.', 'Letting the elbow drift away from the body.', 'Using momentum from the hips.'],
    alternativeId: 'standing-db-curl',
    icon: null, prType: 'weight',
  },
  {
    id: 'db-behind-head-curl', name: 'DB Behind-the-Head Curl', day: 'upper',
    muscles: { primary: ['biceps'] },
    equipment: 'dumbbell', sets: 3, reps: '15', weight: { kg: [6, 8, 10, 12], lb: [13, 18, 22, 26] },
    cues: [
      'Interlock your fingers around the top of one dumbbell behind your head.',
      'Curl up and down through a controlled, moderate range — keep it slow, this is a stretch-focused variation.',
      'Keep elbows pointed forward, not flaring out to the sides.',
    ],
    mistakes: ['Moving too fast through a movement meant to emphasize the stretch.', 'Letting the elbows flare wide.', 'Using too much weight, which limits range of motion behind the head.'],
    alternativeId: 'preacher-curl',
    icon: null, prType: 'weight',
  },
  {
    id: 'cable-bar-curl', name: 'Cable Bar Curl', day: 'upper',
    muscles: { primary: ['biceps'] },
    equipment: 'cable', sets: 3, reps: '15', weight: { kg: [2.5, 5, 7.5], lb: [5.5, 11, 16.5] },
    cues: ['Elbows pinned at your sides, standing tall.', 'Curl the bar up under control, squeeze at the top.', 'Lower slowly for a full stretch.'],
    mistakes: ['Leaning back to heave the bar up.', 'Letting elbows drift forward.', 'Cutting the range of motion short at the bottom.'],
    alternativeId: 'machine-biceps-curl',
    icon: 'curl', prType: 'weight',
  },
  {
    id: 'machine-biceps-curl', name: 'Machine Biceps Curl', day: 'upper',
    muscles: { primary: ['biceps'] },
    equipment: 'machine', sets: 3, reps: '12-15', weight: { kg: [2.5, 5, 7.5], lb: [5.5, 11, 16.5] },
    cues: ['Upper arms flat against the pad the whole set.', 'Curl through a full range, squeeze at the top.', 'Control the negative fully.'],
    mistakes: ['Lifting the upper arms off the pad to cheat the weight up.', 'Partial reps.', 'Letting the weight stack slam on the way down.'],
    alternativeId: 'cable-bar-curl',
    icon: null, prType: 'weight',
  },
  {
    id: 'reverse-tricep-pushdown', name: 'Reverse Tricep Pushdown (palms up)', day: 'upper',
    muscles: { primary: ['triceps'] },
    equipment: 'cable', sets: 3, reps: '10', weight: { kg: [12.5], lb: [27.5] },
    cues: ['Underhand grip, elbows pinned to your sides.', 'Push down through full extension, squeeze the triceps.', "Control the return, don't let elbows flare."],
    mistakes: ['Letting elbows drift away from the body.', 'Using body-weight/leaning to assist the push.', 'Rushing the eccentric.'],
    alternativeId: 'tricep-pushdown',
    icon: null, prType: 'weight',
  },
  {
    id: 'preacher-curl', name: 'Preacher Curl', day: 'upper',
    muscles: { primary: ['biceps'] },
    equipment: 'preacher bench', sets: 3, reps: '10', weight: { kg: [5], lb: [10] },
    cues: [
      'Armpits snug against the top of the pad.',
      'Curl through a full range without lifting your upper arms off the pad.',
      'Lower fully to a dead-stop stretch at the bottom before the next rep.',
    ],
    mistakes: ['Bouncing out of the bottom stretch position (elbow strain risk).', 'Lifting the upper arms off the pad.', 'Using momentum from the shoulders.'],
    alternativeId: 'db-behind-head-curl',
    icon: null, prType: 'weight',
    cardioFinisher: { activity: 'Elliptical', durationMin: 20 },
  },

  // ============================= LOWER (follow-up) =============================
  {
    id: 'lunges', name: 'Lunges', day: 'lower',
    muscles: { primary: ['quads', 'glutes'] },
    equipment: 'bodyweight', sets: 3, reps: '10 per leg', weight: 'bodyweight',
    cues: [
      'Step forward far enough that your front knee stays behind your toes at the bottom.',
      'Lower straight down until both knees are close to 90°.',
      'Push back to standing through your front heel.',
    ],
    mistakes: ['Front knee traveling past the toes and collapsing inward.', 'Leaning the torso too far forward.', 'Back knee slamming into the floor.'],
    alternativeId: 'one-legged-platform-climb',
    icon: 'lunge', prType: 'reps',
  },
  {
    id: 'leg-extension', name: 'Leg Extension (2nd weekly quad session)', day: 'lower',
    isSecondSession: true,
    muscles: { primary: ['quads'] },
    equipment: 'machine', sets: 2, reps: '15', weight: { kg: [], lb: [] },
    cues: [
      'Same technique as Legs day — full extension, brief squeeze, controlled lowering.',
      "Keep it lighter than your Legs-day weight; this is a volume top-up on a day your legs are already partly fatigued from hamstring/glute work.",
    ],
    mistakes: ['Trying to match your Legs-day weight here.', 'Using momentum by kicking the weight up.', 'Partial range of motion.'],
    alternativeNote: 'A lighter set on the Seated Leg Press (feet low on the platform) works as a substitute.',
    note: "This is what gets your quads to true 2x/week frequency — without it, quads would only be trained once.",
    icon: null, prType: 'weight',
  },
  {
    id: 'seated-leg-curl', name: 'Seated Leg Curl', day: 'lower',
    muscles: { primary: ['hamstrings'] },
    equipment: 'machine', sets: 3, reps: '15', weight: { kg: [42.5], lb: [94] },
    cues: [
      'Back flat against the pad, ankle pad positioned just above your heel.',
      'Curl through a full range, squeeze the hamstrings at the bottom of the curl.',
      'Control the return to a full stretch.',
    ],
    mistakes: ['Using momentum by jerking the weight.', 'Lifting the hips off the seat to cheat the rep.', 'Only doing a partial range of motion.'],
    alternativeId: 'lying-standing-leg-curl',
    icon: 'legcurl', prType: 'weight',
  },
  {
    id: 'lying-standing-leg-curl', name: 'Lying/Standing Leg Curl', day: 'lower',
    muscles: { primary: ['hamstrings'] },
    equipment: 'machine', sets: 3, reps: '10', weight: { kg: [30], lb: [65] },
    cues: ['Hips pressed into the pad/bench, no arching.', 'Curl the heel toward your glutes under control.', 'Lower with control for a full stretch.'],
    mistakes: ['Hips lifting off the pad to swing the weight up.', 'Rushing the eccentric.', 'Partial range of motion.'],
    alternativeId: 'seated-leg-curl',
    icon: null, prType: 'weight',
  },
  {
    id: 'glute-machine', name: 'Glute Machine', day: 'lower',
    muscles: { primary: ['glutes'] },
    equipment: 'machine', sets: 3, reps: '10-15', weight: { kg: [11, 18, 20], lb: [24, 40, 44] },
    cues: [
      'Brace your core and keep your back neutral, not arched, throughout.',
      'Drive through the heel, squeezing the glute hard at full extension.',
      'Control the return without letting momentum take over.',
    ],
    mistakes: ['Overarching the lower back to add range of motion.', 'Using momentum/swinging instead of a controlled squeeze.', 'Rushing through reps instead of pausing at the top contraction.'],
    alternativeId: 'lunges',
    icon: null, prType: 'weight',
  },
  {
    id: 'calf-extension-machine', name: 'Calf Extension Machine', day: 'lower',
    muscles: { primary: ['calves'] },
    equipment: 'machine', sets: 3, reps: '20', weight: { kg: [4.5], lb: [10] },
    cues: ['Full stretch at the bottom, heels dropping as low as comfortable.', 'Rise fully onto your toes and pause briefly at the top.', 'Control the lowering phase.'],
    mistakes: ['Bouncing instead of pausing at the top and bottom.', 'Using a short, partial range of motion.', 'Rushing through the set instead of controlling tempo.'],
    alternativeId: 'calf-raise-machine',
    icon: null, prType: 'weight',
    cardioFinisher: { activity: 'Incline treadmill walk/run', durationMin: 20 },
  },
];

/** Core finishers (ab curls + leg raises) logged on Pull and Upper days — see Master Prompt program summary. */
export const CORE_FINISHERS: Pick<Exercise, 'id' | 'name' | 'day' | 'muscles' | 'sets' | 'reps' | 'weight' | 'icon' | 'prType'>[] = [
  {
    id: 'ab-curls-pull', name: 'Ab Curls', day: 'pull',
    muscles: { primary: ['core'] }, sets: 3, reps: '15', weight: 'bodyweight', icon: null, prType: 'reps',
  },
  {
    id: 'leg-raises-pull', name: 'Leg Raises', day: 'pull',
    muscles: { primary: ['core'] }, sets: 3, reps: '15', weight: 'bodyweight', icon: null, prType: 'reps',
  },
  {
    id: 'ab-curls-upper', name: 'Ab Curls', day: 'upper',
    muscles: { primary: ['core'] }, sets: 3, reps: '15', weight: 'bodyweight', icon: null, prType: 'reps',
  },
  {
    id: 'leg-raises-upper', name: 'Leg Raises', day: 'upper',
    muscles: { primary: ['core'] }, sets: 3, reps: '15', weight: 'bodyweight', icon: null, prType: 'reps',
  },
];

/**
 * Total exercise count check: 9 Push + 11 Pull + 6 Legs + 13 Upper (2 shared IDs with
 * Push/Pull as lighter follow-ups) + 6 Lower (1 shared ID with Legs) + 4 core finishers
 * = every exercise from the original program docx, including the deadlift warm-up sets
 * (folded into the `deadlift` entry's `warmup` field, per the user's clarification that
 * "Weight Lifting – 20kg (10x3)" was the deadlift warm-up).
 */
