import { deleteStoreValue, getDB, getStoreValue, setStoreValue } from "./index";
import type {
  ProgramRecord,
  DayKey,
  DayAssignment,
  LibraryExercise,
} from "@/lib/program/types";
import { PROGRAM_STORE_KEYS } from "@/lib/program/types";
import { buildProgramFromSeed, validateProgram } from "@/lib/program/seed";

export async function loadProgram(): Promise<ProgramRecord> {
  const exercises = await getStoreValue<ProgramRecord["exercises"]>(
    "program",
    PROGRAM_STORE_KEYS.exercises,
  );
  const assignments = await getStoreValue<ProgramRecord["assignments"]>(
    "program",
    PROGRAM_STORE_KEYS.assignments,
  );
  const cycleOrder = await getStoreValue<ProgramRecord["cycleOrder"]>(
    "program",
    PROGRAM_STORE_KEYS.cycleOrder,
  );

  if (exercises && assignments && cycleOrder && Object.keys(exercises).length > 0) {
    return { exercises, assignments, cycleOrder };
  }

  const seeded = buildProgramFromSeed();
  const errors = validateProgram(seeded);
  if (errors.length) {
    console.error("[protocol/program] seed validation failed", errors);
  }
  await persistProgram(seeded);
  return seeded;
}

export async function persistProgram(program: ProgramRecord): Promise<void> {
  await setStoreValue("program", PROGRAM_STORE_KEYS.exercises, program.exercises);
  await setStoreValue(
    "program",
    PROGRAM_STORE_KEYS.assignments,
    program.assignments,
  );
  await setStoreValue("program", PROGRAM_STORE_KEYS.cycleOrder, program.cycleOrder);
}

/** Restore library + assignments from seed. Does not touch notes or history. */
export async function resetProgramToDefault(): Promise<ProgramRecord> {
  const seeded = buildProgramFromSeed();
  await persistProgram(seeded);
  return seeded;
}

export async function loadAllNotes(): Promise<Record<string, string>> {
  const db = await getDB();
  const keys = await db.getAllKeys("notes");
  const values = await db.getAll("notes");
  const notes: Record<string, string> = {};
  keys.forEach((key, i) => {
    const value = values[i];
    if (typeof value === "string") notes[String(key)] = value;
  });
  return notes;
}

export async function saveNote(exerciseId: string, text: string): Promise<void> {
  if (text.trim() === "") {
    await deleteStoreValue("notes", exerciseId);
    return;
  }
  await setStoreValue("notes", exerciseId, text);
}

export function daysForExercise(
  program: ProgramRecord,
  exerciseId: string,
): DayKey[] {
  const days: DayKey[] = [];
  for (const [day, rows] of Object.entries(program.assignments) as [
    DayKey,
    DayAssignment[],
  ][]) {
    if (rows.some((r) => r.exerciseId === exerciseId) && !days.includes(day)) {
      days.push(day);
    }
  }
  return days;
}

export function assignmentOnDay(
  program: ProgramRecord,
  exerciseId: string,
  day: DayKey,
): DayAssignment | undefined {
  return program.assignments[day]?.find((a) => a.exerciseId === exerciseId);
}

export type AssignedExercise = {
  exercise: LibraryExercise;
  assignment: DayAssignment;
};

export function assignedExercisesForDay(
  program: ProgramRecord,
  day: DayKey,
): AssignedExercise[] {
  return (program.assignments[day] ?? [])
    .map((assignment) => {
      const exercise = program.exercises[assignment.exerciseId];
      if (!exercise) return null;
      return { exercise, assignment };
    })
    .filter((row): row is AssignedExercise => row !== null);
}

