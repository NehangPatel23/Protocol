import { deleteStoreValue, getDB, setStoreValue } from "./index";
import type { PersonalRecord } from "@/lib/progress/prs";

export type { PersonalRecord };

export async function loadAllPRs(): Promise<Record<string, PersonalRecord>> {
  const db = await getDB();
  const keys = await db.getAllKeys("prs");
  const values = await db.getAll("prs");
  const prs: Record<string, PersonalRecord> = {};
  keys.forEach((key, i) => {
    const value = values[i];
    if (value && typeof value === "object") {
      prs[String(key)] = value as PersonalRecord;
    }
  });
  return prs;
}

export async function savePR(
  exerciseId: string,
  record: PersonalRecord,
): Promise<void> {
  await setStoreValue("prs", exerciseId, record);
}

export async function deletePR(exerciseId: string): Promise<void> {
  await deleteStoreValue("prs", exerciseId);
}
