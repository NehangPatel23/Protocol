import {
  CORE_FINISHERS,
  EXERCISES,
  DAYS,
  type Exercise,
} from "../../../docs/program-data";
import type {
  DayAssignment,
  DayKey,
  LibraryExercise,
  ProgramRecord,
} from "./types";

function canonicalName(name: string): string {
  return name.replace(/\s*\(2nd weekly[^)]*\)\s*$/i, "").trim();
}

function toLibrary(ex: Exercise): LibraryExercise {
  return {
    id: ex.id,
    name: canonicalName(ex.name),
    muscles: ex.muscles,
    equipment: ex.equipment,
    setup: ex.setup,
    cues: ex.cues,
    mistakes: ex.mistakes,
    alternativeId: ex.alternativeId,
    alternativeNote: ex.alternativeNote,
    note: ex.note,
    difficultyTags: ex.difficultyTags,
    icon: ex.icon,
    prType: ex.prType,
  };
}

function toAssignment(ex: Exercise, isNewLibraryEntry: boolean): DayAssignment {
  const assignment: DayAssignment = {
    exerciseId: ex.id,
    sets: ex.sets,
    reps: ex.reps,
    weight: ex.weight,
    warmup: ex.warmup,
    isSecondSession: ex.isSecondSession,
    cardioFinisher: ex.cardioFinisher,
    alternativeId: ex.alternativeId,
    alternativeNote: ex.alternativeNote,
  };

  // Follow-up instances keep their own cue/mistake copy on the assignment
  // so the library stays the primary-session technique reference.
  if (ex.isSecondSession && !isNewLibraryEntry) {
    assignment.sessionCues = ex.cues;
    assignment.sessionMistakes = ex.mistakes;
    assignment.sessionNote = ex.note;
  }

  return assignment;
}

function emptyAssignments(): Record<DayKey, DayAssignment[]> {
  return {
    push: [],
    pull: [],
    legs: [],
    rest: [],
    upper: [],
    lower: [],
  };
}

/**
 * Transform the flat seed file into the §2.2a library + assignments split.
 * Duplicate ids (Upper/Lower follow-ups of a Push/Pull/Legs lift) become one
 * library entry and two assignment rows.
 */
export function buildProgramFromSeed(): ProgramRecord {
  const exercises: Record<string, LibraryExercise> = {};
  const assignments = emptyAssignments();

  for (const ex of EXERCISES) {
    const isNew = !exercises[ex.id];
    if (isNew) {
      exercises[ex.id] = toLibrary(ex);
    }
    assignments[ex.day].push(toAssignment(ex, isNew));
  }

  for (const fin of CORE_FINISHERS) {
    if (!exercises[fin.id]) {
      exercises[fin.id] = {
        id: fin.id,
        name: fin.name,
        muscles: fin.muscles,
        equipment: "bodyweight",
        cues: [],
        mistakes: [],
        icon: fin.icon,
        prType: fin.prType,
      };
    }
    assignments[fin.day].push({
      exerciseId: fin.id,
      sets: fin.sets,
      reps: fin.reps,
      weight: fin.weight,
    });
  }

  return {
    exercises,
    assignments,
    cycleOrder: DAYS.map((d) => d.key),
  };
}

export function validateProgram(program: ProgramRecord): string[] {
  const errors: string[] = [];
  const { exercises, assignments } = program;

  for (const ex of EXERCISES) {
    if (!exercises[ex.id]) {
      errors.push(`Missing library entry for seed id "${ex.id}"`);
    }
    const onDay = assignments[ex.day]?.some((a) => a.exerciseId === ex.id);
    if (!onDay) {
      errors.push(`Seed exercise "${ex.id}" not assigned to ${ex.day}`);
    }
  }

  for (const fin of CORE_FINISHERS) {
    if (!exercises[fin.id]) {
      errors.push(`Missing library entry for core finisher "${fin.id}"`);
    }
    const onDay = assignments[fin.day]?.some((a) => a.exerciseId === fin.id);
    if (!onDay) {
      errors.push(`Core finisher "${fin.id}" not assigned to ${fin.day}`);
    }
  }

  for (const [day, rows] of Object.entries(assignments) as [
    DayKey,
    DayAssignment[],
  ][]) {
    for (const row of rows) {
      if (!exercises[row.exerciseId]) {
        errors.push(`Assignment on ${day} points at missing "${row.exerciseId}"`);
      }
    }
  }

  for (const ex of Object.values(exercises)) {
    if (ex.alternativeId && !exercises[ex.alternativeId]) {
      errors.push(
        `Exercise "${ex.id}" alternativeId "${ex.alternativeId}" is not in the library`,
      );
    }
  }

  for (const [day, rows] of Object.entries(assignments) as [
    DayKey,
    DayAssignment[],
  ][]) {
    for (const row of rows) {
      if (row.alternativeId && !exercises[row.alternativeId]) {
        errors.push(
          `Assignment ${row.exerciseId} on ${day} alternativeId "${row.alternativeId}" is not in the library`,
        );
      }
    }
  }

  return errors;
}
