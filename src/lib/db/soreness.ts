import { getStoreValue, setStoreValue } from "./index";
import type { SorenessRecord } from "./cardio";

export async function loadSoreness(): Promise<Record<string, SorenessRecord>> {
  const value = await getStoreValue<Record<string, SorenessRecord>>(
    "soreness",
    "days",
  );
  return value ?? {};
}

export async function saveSoreness(
  records: Record<string, SorenessRecord>,
): Promise<void> {
  await setStoreValue("soreness", "days", records);
}

export function upsertSoreness(
  records: Record<string, SorenessRecord>,
  date: string,
  record: SorenessRecord,
): Record<string, SorenessRecord> {
  return { ...records, [date]: record };
}
