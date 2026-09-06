"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";
import { DAY_CHIP, DAY_ICONS, DAY_LABELS } from "@/lib/program/days";
import type { DayKey } from "@/lib/program/types";

export function ChooseDifferentDay({
  pendingDayKey,
  cycleOrder,
  disabled,
  saving,
  onChoose,
}: {
  pendingDayKey: DayKey;
  cycleOrder: DayKey[];
  disabled?: boolean;
  saving?: boolean;
  onChoose: (dayKey: DayKey) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<DayKey | null>(null);
  const choices = uniqueTrainingDays(cycleOrder).filter(
    (k) => k !== pendingDayKey,
  );

  function close() {
    setOpen(false);
    setPicked(null);
  }

  return (
    <>
      <button
        type="button"
        data-testid="choose-different-day"
        disabled={disabled || saving || choices.length === 0}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 text-[14px] font-semibold text-secondary hover:text-primary disabled:opacity-60"
      >
        <Repeat className="h-4 w-4" aria-hidden />
        Choose a different day
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-base/70 p-4 md:items-center"
          role="presentation"
        >
          <div
            role="dialog"
            aria-labelledby="choose-day-title"
            data-testid="choose-different-day-dialog"
            className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {picked == null ? (
              <>
                <h2
                  id="choose-day-title"
                  className="text-[18px] font-semibold text-primary"
                >
                  Choose a different day
                </h2>
                <p className="mt-2 text-[15px] text-secondary">
                  Start Workout still defaults to {DAY_LABELS[pendingDayKey]}.
                  Pick another program day to log today instead.
                </p>
                <ul className="mt-4 flex flex-col gap-2">
                  {choices.map((key) => {
                    const chip = DAY_CHIP[key];
                    const Icon = DAY_ICONS[key];
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          data-testid={`choose-day-${key}`}
                          onClick={() => setPicked(key)}
                          className={`inline-flex min-h-12 w-full items-center gap-3 rounded-xl border ${chip.border} bg-base px-4 text-left text-[15px] font-semibold ${chip.text}`}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                          {DAY_LABELS[key]}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={close}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-[15px] font-medium text-secondary"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h2
                  id="choose-day-title"
                  className="text-[18px] font-semibold text-primary"
                >
                  Log {DAY_LABELS[picked]} instead?
                </h2>
                <p
                  className="mt-2 text-[15px] text-secondary"
                  data-testid="choose-day-confirm-copy"
                >
                  This will mark {DAY_LABELS[pendingDayKey]} as skipped, not
                  missed — continue?
                </p>
                <button
                  type="button"
                  data-testid="choose-day-confirm"
                  disabled={saving}
                  onClick={() => {
                    void (async () => {
                      try {
                        await onChoose(picked);
                        close();
                      } catch {
                        /* keep the sheet open so they can retry */
                      }
                    })();
                  }}
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent text-[14px] font-bold uppercase tracking-[0.08em] text-accent-foreground disabled:opacity-60"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setPicked(null)}
                  className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-[15px] font-medium text-secondary"
                >
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function uniqueTrainingDays(cycleOrder: DayKey[]): DayKey[] {
  const seen = new Set<DayKey>();
  const out: DayKey[] = [];
  for (const key of cycleOrder) {
    if (key === "rest" || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
