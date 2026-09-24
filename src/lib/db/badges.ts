import { getDB, setStoreValue } from "./index";
import type { Badge } from "@/lib/progress/badges";

export async function loadAllBadges(): Promise<Record<string, Badge>> {
  const db = await getDB();
  const keys = await db.getAllKeys("badges");
  const values = await db.getAll("badges");
  const badges: Record<string, Badge> = {};
  keys.forEach((key, i) => {
    const value = values[i];
    if (value && typeof value === "object" && "id" in (value as Badge)) {
      badges[String(key)] = value as Badge;
    }
  });
  return badges;
}

export async function saveBadge(badge: Badge): Promise<void> {
  await setStoreValue("badges", badge.id, badge);
}

export async function persistBadges(badges: Badge[]): Promise<void> {
  await Promise.all(badges.map((badge) => saveBadge(badge)));
}
