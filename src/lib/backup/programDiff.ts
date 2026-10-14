import { buildProgramFromSeed } from "@/lib/program/seed";
import type { ProgramRecord } from "@/lib/program/types";
import { stableStringify } from "./stableJson";

/** True when the stored program matches seed (no user edits). */
export function isSeedOnlyProgram(program: ProgramRecord): boolean {
  return stableStringify(program) === stableStringify(buildProgramFromSeed());
}
