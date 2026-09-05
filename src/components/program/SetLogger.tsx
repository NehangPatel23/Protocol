"use client";

import { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useAlerts } from "@/components/alerts/AlertProvider";
import { usePrefs } from "@/components/PrefsProvider";
import { Spinner } from "@/components/ui/Spinner";
import { displayToKg, kgToDisplay, unitLabel } from "@/lib/program/format";
import type { PRType } from "@/lib/program/types";

interface SetLoggerProps {
  prType: PRType;
  lastWeightKg?: number;
  lastReps?: number;
  prescribedWeightKg?: number | null;
  prescribedReps?: number | null;
  onLog: (input: { weightKg: number; reps: number }) => Promise<void>;
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
  const inflight = useRef(false);
  const lastPayload = useRef<{ weightKg: number; reps: number } | null>(null);

  const weightStep = units === "kg" ? 2.5 : 5;

  function nudgeWeight(dir: -1 | 1) {
    const current = parseNonNeg(weight) ?? 0;
    const next = Math.max(0, Math.round((current + dir * weightStep) * 2) / 2);
    setWeight(String(next));
    setConfirmHeavy(false);
  }

  function nudgeReps(dir: -1 | 1) {
    const current = parseNonNeg(reps) ?? 0;
    setReps(String(Math.max(0, Math.round(current + dir))));
    setConfirmZeroReps(false);
  }

  async function persist(payload: { weightKg: number; reps: number }) {
    lastPayload.current = payload;
    await onLog(payload);
    alerts.dismiss("set-save-failed");
    alerts.success(
      `${payload.reps} × ${kgToDisplay(payload.weightKg, units)} ${unitLabel(units)} logged`,
      { title: "Set saved" },
    );
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
    try {
      await persist({ weightKg, reps: r });
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
