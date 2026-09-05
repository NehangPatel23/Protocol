"use client";

import { useEffect, useState } from "react";
import {
  extendRest,
  formatRestClock,
  remainingRestSec,
} from "@/lib/session/restTimer";

interface RestTimerProps {
  endsAt: string | null;
  durationSec: number | null;
  onSkip: () => void;
  onExtend: (nextEndsAt: string) => void;
}

export function RestTimer({
  endsAt,
  durationSec,
  onSkip,
  onExtend,
}: RestTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;

  const remaining = remainingRestSec(endsAt, now);
  const total = Math.max(durationSec ?? remaining, 1);
  const ratio = remaining <= 0 ? 0 : Math.min(1, remaining / total);
  const done = remaining <= 0;
  const warning = remaining > 0 && remaining <= 10;
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = circ * ratio;

  return (
    <section
      className={`rounded-xl border px-4 py-4 ${
        done
          ? "border-warning/50 bg-warning-bg"
          : warning
            ? "border-warning/40 bg-surface"
            : "border-accent/40 bg-surface"
      }`}
      data-testid="rest-timer"
      data-rest-done={done ? "true" : "false"}
      role="timer"
      aria-live="polite"
      aria-label={done ? "Rest over" : `Rest ${formatRestClock(remaining)}`}
    >
      <p className="mb-3 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        {done ? "Rest over" : "Rest"}
      </p>
      <div className="relative mx-auto h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-28 w-28" aria-hidden>
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            className="stroke-border-subtle"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            className={done || warning ? "stroke-warning" : "stroke-accent"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <p
          className={`tabular absolute inset-0 flex items-center justify-center font-mono text-[22px] font-bold ${
            done ? "text-warning" : "text-primary"
          }`}
        >
          {done ? "0:00" : formatRestClock(remaining)}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onExtend(extendRest(endsAt, 15, Date.now()))}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-subtle text-[13px] font-semibold uppercase tracking-[0.08em] text-secondary"
        >
          +15s
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-accent/40 text-[13px] font-semibold uppercase tracking-[0.08em] text-accent"
        >
          {done ? "Dismiss" : "Skip"}
        </button>
      </div>
    </section>
  );
}
