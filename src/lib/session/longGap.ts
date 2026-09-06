/**
 * Long-gap prompt — Master Prompt §2.7 / §6.1.
 * Pickup is `dismissLongGap`. Jump is `jumpToDay` to `weekdaySuggestedDay`.
 */

import {
  dismissLongGap,
  jumpToDay,
  weekdaySuggestedDay,
  type CycleState,
} from "@/lib/program/cycle";
import type { DayKey } from "@/lib/program/types";

export interface LongGapPersistence {
  save: (state: CycleState) => Promise<void>;
  load: () => Promise<CycleState | undefined>;
}

export async function persistLongGapPickup(
  cycle: CycleState,
  persistence: LongGapPersistence,
): Promise<CycleState> {
  const next = dismissLongGap(cycle);
  await persistence.save(next);
  const stored = await persistence.load();
  if (!stored) {
    throw new Error("[protocol/session] long-gap pickup did not persist");
  }
  if (stored.longGapDismissedFor !== next.longGapDismissedFor) {
    throw new Error(
      "[protocol/session] long-gap pickup did not persist dismiss",
    );
  }
  return stored;
}

export async function persistLongGapJump(
  cycle: CycleState,
  today: string,
  cycleOrder: DayKey[],
  persistence: LongGapPersistence,
): Promise<CycleState> {
  const suggested = weekdaySuggestedDay(today, cycleOrder);
  const next = jumpToDay(cycle, today, cycleOrder, suggested);
  await persistence.save(next);
  const stored = await persistence.load();
  if (!stored) {
    throw new Error("[protocol/session] long-gap jump did not persist");
  }
  if (stored.pointerIndex !== next.pointerIndex) {
    throw new Error("[protocol/session] long-gap jump did not persist pointer");
  }
  if (stored.pendingSince !== today) {
    throw new Error(
      "[protocol/session] long-gap jump did not persist pendingSince",
    );
  }
  return stored;
}
