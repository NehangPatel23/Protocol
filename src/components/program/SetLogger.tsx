"use client";

import { useMemo, useRef, useState } from "react";
import { Minus, Plus, Trophy } from "lucide-react";
import { useAlerts } from "@/components/alerts/AlertProvider";
import { usePrefs } from "@/components/PrefsProvider";
import { Spinner } from "@/components/ui/Spinner";
import { displayToKg, kgToDisplay, unitLabel } from "@/lib/program/format";
import { matchesWarmupPattern, type WarmupPrescription } from "@/lib/progress/prs";
import { parseRpe } from "@/lib/progress/rpe";
import type { PRType } from "@/lib/program/types";

export interface LogSetPayload {
  weightKg: number;
  reps: number;
  isWarmup: boolean;
  rpe?: number;
}

interface SetLoggerProps {
  prType: PRType;
  lastWeightKg?: number;
  lastReps?: number;
  prescribedWeightKg?: number | null;
  prescribedReps?: number | null;
  warmup?: WarmupPrescription;
  onLog: (input: LogSetPayload) => Promise<{ isPR?: boolean } | void>;
  /** Override the helper line under Log set. `null` hides it. */
  hintText?: string | null;
}

function parseNonNeg(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function SetLogger({
  prType,
  lastWeightKg,
  lastReps,
  prescribedWeightKg,
  prescribedReps,
  warmup,
  onLog,
  hintText,
}: SetLoggerProps) {
  const { prefs } = usePrefs();
  const alerts = useAlerts();
  const units = prefs.units;
  const bodyweight = prType === "reps";
  const defaultKg = lastWeightKg ?? prescribedWeightKg ?? 0;
  const defaultReps = lastReps ?? prescribedReps ?? 5;

  const [weight, setWeight] = useState(
    bodyweight && defaultKg === 0 ? "0" : String(kgToDisplay(defaultKg, units)),
  );
  const [reps, setReps] = useState(String(defaultReps));
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [confirmZeroReps, setConfirmZeroReps] = useState(false);
  const [confirmHeavy, setConfirmHeavy] = useState(false);
  const [warmupForced, setWarmupForced] = useState<boolean | null>(null);
  const [rpe, setRpe] = useState<number | null>(null);
  const inflight = useRef(false);
  const lastPayload = useRef<LogSetPayload | null>(null);

  const weightStep = units === "kg" ? 2.5 : 5;

  const parsedWeight = parseNonNeg(weight);
  const parsedReps = parseNonNeg(reps);
  const matchesProgrammedWarmup = useMemo(() => {
    if (!warmup || parsedWeight === null || parsedReps === null) return false;
    return matchesWarmupPattern(
      { weightKg: displayToKg(parsedWeight, units), reps: parsedReps },
      warmup,
    );
  }, [parsedReps, parsedWeight, units, warmup]);
  const isWarmup = warmupForced ?? matchesProgrammedWarmup;

  function nudgeWeight(dir: -1 | 1) {
    const current = parseNonNeg(weight) ?? 0;
    const next = Math.max(0, Math.round((current + dir * weightStep) * 2) / 2);
    setWeight(String(next));
    setConfirmHeavy(false);
    setWarmupForced(null);
  }

  function nudgeReps(dir: -1 | 1) {
    const current = parseNonNeg(reps) ?? 0;
    setReps(String(Math.max(0, Math.round(current + dir))));
    setConfirmZeroReps(false);
    setWarmupForced(null);
  }

  async function persist(payload: LogSetPayload) {
    lastPayload.current = payload;
    const result = await onLog(payload);
    alerts.dismiss("set-save-failed");
    const summary = `${payload.reps} × ${kgToDisplay(payload.weightKg, units)} ${unitLabel(units)} logged`;
    if (result?.isPR) {
      alerts.success(summary, {
        title: "New PR",
        icon: Trophy,
        durationMs: 3000,
      });
    } else {
      alerts.success(summary, { title: "Set saved" });
    }
  }

  async function log() {
    if (inflight.current) return;
    const w = parseNonNeg(weight);
    const r = parseNonNeg(reps);
    if (w === null) {
      setHint("Enter a weight of 0 or more.");
      alerts.warning("Enter a weight of 0 or more.");
      return;
    }
    if (r === null || !Number.isInteger(r)) {
      setHint("Enter whole-number reps.");
      alerts.warning("Enter whole-number reps.");
      return;
    }
    if (r === 0 && !confirmZeroReps) {
      setConfirmZeroReps(true);
      setHint("0 reps is a failed set — tap Log set again to confirm.");
      alerts.warning("0 reps is a failed set — tap Log set again to confirm.");
      return;
    }
    const weightKg = displayToKg(w, units);
    if (weightKg > 400 && !confirmHeavy) {
      setConfirmHeavy(true);
      setHint("That’s well outside a typical range — tap Log set again to confirm.");
      alerts.warning(
        "That’s well outside your usual range — tap Log set again to confirm.",
      );
      return;
    }

    inflight.current = true;
    setSaving(true);
    setHint(null);
    const parsedRpe = parseRpe(rpe);
    const payload: LogSetPayload = {
      weightKg,
      reps: r,
      isWarmup,
      ...(parsedRpe != null ? { rpe: parsedRpe } : {}),
    };
    lastPayload.current = payload;
    try {
      await persist(payload);
      setConfirmZeroReps(false);
      setConfirmHeavy(false);
    } catch {
      alerts.danger("Couldn’t save this set — your log isn’t persisted yet.", {
        id: "set-save-failed",
        title: "Save failed",
        durationMs: null,
        action: {
          label: "Retry",
          onClick: async () => {
            const payload = lastPayload.current;
            if (!payload) return;
            try {
              await persist(payload);
            } catch {
              /* keep persistent toast */
            }
          },
        },
      });
    } finally {
      setSaving(false);
      inflight.current = false;
    }
  }

  return (
    <section className="rounded-xl border border-accent/40 bg-surface p-4">
      <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
        Log set
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Weight ({unitLabel(units)})
            {bodyweight ? " · 0 = BW" : null}
          </p>
          <div className="flex items-stretch gap-1">
            <button
              type="button"
              onClick={() => nudgeWeight(-1)}
              className="flex min-h-12 min-w-11 items-center justify-center rounded-lg border border-border-subtle bg-base text-secondary"
              aria-label={`Decrease weight by ${weightStep}`}
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value);
                setConfirmHeavy(false);
                setHint(null);
                setWarmupForced(null);
              }}
              className="tabular min-h-12 min-w-0 flex-1 rounded-lg border border-border-subtle bg-base px-2 text-center font-mono text-[17px] font-semibold text-primary focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => nudgeWeight(1)}
              className="flex min-h-12 min-w-11 items-center justify-center rounded-lg border border-border-subtle bg-base text-secondary"
              aria-label={`Increase weight by ${weightStep}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div>
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Reps
          </p>
          <div className="flex items-stretch gap-1">
            <button
              type="button"
              onClick={() => nudgeReps(-1)}
              className="flex min-h-12 min-w-11 items-center justify-center rounded-lg border border-border-subtle bg-base text-secondary"
              aria-label="Decrease reps"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={reps}
              onChange={(e) => {
                setReps(e.target.value);
                setConfirmZeroReps(false);
                setHint(null);
                setWarmupForced(null);
              }}
              className="tabular min-h-12 min-w-0 flex-1 rounded-lg border border-border-subtle bg-base px-2 text-center font-mono text-[17px] font-semibold text-primary focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => nudgeReps(1)}
              className="flex min-h-12 min-w-11 items-center justify-center rounded-lg border border-border-subtle bg-base text-secondary"
              aria-label="Increase reps"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          data-testid="log-warmup"
          checked={isWarmup}
          onChange={(e) => setWarmupForced(e.target.checked)}
          className="h-5 w-5 shrink-0 rounded border-border-subtle accent-accent"
        />
        <span className="text-[14px] text-primary">
          Warm-up set
          <span className="block text-[13px] text-muted">
            Excluded from PRs and weekly volume
          </span>
        </span>
      </label>
      <fieldset className="mt-3" data-testid="log-rpe">
        <legend className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          RPE (optional)
        </legend>
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const selected = rpe === n;
            return (
              <button
                key={n}
                type="button"
                data-testid={`log-rpe-${n}`}
                aria-pressed={selected}
                onClick={() => setRpe((prev) => (prev === n ? null : n))}
                className={`min-h-11 rounded-lg border font-mono text-[14px] font-semibold ${
                  selected
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border-subtle bg-base text-secondary"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[13px] text-muted">
          10 is all-out. Skip if you are not tracking effort.
        </p>
      </fieldset>
      <button
        type="button"
        onClick={() => void log()}
        disabled={saving}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-bold uppercase tracking-[0.08em] text-accent-foreground disabled:opacity-60"
      >
        {saving ? (
          <>
            <Spinner
              size="sm"
              label="Saving"
              className="border-accent-foreground/30 border-t-accent-foreground"
            />
            Saving…
          </>
        ) : (
          "Log set"
        )}
      </button>
      {hint ? (
        <p className="mt-2 text-[13px] text-warning" role="status">
          {hint}
        </p>
      ) : hintText === null ? null : (
        <p className="mt-2 text-[13px] text-muted">
          {hintText ??
            "Saves this set to today. Full workout sessions come later from Home."}
        </p>
      )}
    </section>
  );
}
