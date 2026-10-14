/**
 * Validate-only path for the read-only backup viewer.
 * Does not check device emptiness and never touches IndexedDB.
 */

import type { WeightUnit } from "@/lib/db/schema";
import { buildProgramFromSeed } from "@/lib/program/seed";
import type { ProgramRecord } from "@/lib/program/types";
import type { BackupFileV1 } from "./types";
import { parseBackupJson, validateBackupFile } from "./validate";

/** Parse + validate. Throws BackupError; never writes. */
export function parseBackupForView(rawText: string): BackupFileV1 {
  return validateBackupFile(parseBackupJson(rawText));
}

export function resolvePreviewProgram(backup: BackupFileV1): ProgramRecord {
  return backup.data.program ?? buildProgramFromSeed();
}

export function resolvePreviewUnits(
  backup: BackupFileV1,
  fallback: WeightUnit,
): WeightUnit {
  const units = backup.data.prefs?.units;
  return units === "kg" || units === "lb" ? units : fallback;
}
