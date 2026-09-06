"use client";

import {
  shouldPromptLongGap,
  weekdaySuggestedDay,
  type CalendarEntry,
  type CycleState,
} from "@/lib/program/cycle";
import { DAY_CHIP, DAY_ICONS, DAY_LABELS } from "@/lib/program/days";
import type { DayKey } from "@/lib/program/types";

export function LongGapPrompt({
  cycle,
  today,
  calendar,
  cycleOrder,
  pendingDayKey,
  saving,
  onPickup,
  onJump,
}: {
  cycle: CycleState;
  today: string;
  calendar: Record<string, CalendarEntry>;
  cycleOrder: DayKey[];
  pendingDayKey: DayKey;
  saving?: boolean;
  onPickup: () => void | Promise<void>;
  onJump: () => void | Promise<void>;
}) {
  if (!shouldPromptLongGap(cycle, today, calendar)) return null;

  const suggested = weekdaySuggestedDay(today, cycleOrder);
  const pendingChip = DAY_CHIP[pendingDayKey];
  const suggestedChip = DAY_CHIP[suggested];
  const PendingIcon = DAY_ICONS[pendingDayKey];
  const SuggestedIcon = DAY_ICONS[suggested];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-base/70 p-4 md:items-center"
      role="presentation"
    >
      <div
        role="dialog"
        aria-labelledby="long-gap-title"
        aria-modal="true"
        data-testid="long-gap-prompt"
        className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-5 shadow-xl"
      >
        <h2
          id="long-gap-title"
          className="text-[18px] font-semibold text-primary"
        >
          It’s been a bit
        </h2>
        <p className="mt-2 text-[15px] text-secondary">
          Pick up at {DAY_LABELS[pendingDayKey]} where you left off, or jump
          back in with a fresh {DAY_LABELS[suggested]} day?
        </p>
        <button
          type="button"
          data-testid="long-gap-pickup"
          disabled={saving}
          onClick={() => void onPickup()}
          className={`mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 ${pendingChip.border} ${pendingChip.text} text-[14px] font-bold uppercase tracking-[0.08em] disabled:opacity-60`}
        >
          <PendingIcon className="h-4 w-4" aria-hidden />
          Pick up {DAY_LABELS[pendingDayKey]}
        </button>
        <button
          type="button"
          data-testid="long-gap-jump"
          disabled={saving}
          onClick={() => void onJump()}
          className={`mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border ${suggestedChip.border} bg-base ${suggestedChip.text} text-[14px] font-bold uppercase tracking-[0.08em] disabled:opacity-60`}
        >
          <SuggestedIcon className="h-4 w-4" aria-hidden />
          Jump to {DAY_LABELS[suggested]}
        </button>
      </div>
    </div>
  );
}
