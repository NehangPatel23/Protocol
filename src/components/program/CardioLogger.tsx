"use client";

import { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { usePrefs } from "@/components/PrefsProvider";
import { Spinner } from "@/components/ui/Spinner";
import { speedUnitFromDistance, type CardioLog } from "@/lib/db/cardio";

function parseNonNeg(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

interface CardioLoggerProps {
  activity: string;
  defaultDurationMin?: number;
  skipLabel?: string;
  onSave: (log: CardioLog) => Promise<void>;
  onSkip?: () => Promise<void>;
}

/**
 * Shared cardio logger — duration plus optional distance, speed, incline,
 * resistance, and HR. Used by sore-day recovery and program finishers.
 */
export function CardioLogger({
  activity,
  defaultDurationMin = 15,
  skipLabel,
  onSave,
  onSkip,
}: CardioLoggerProps) {
  const { prefs } = usePrefs();
  const distanceUnit = prefs.distanceUnits;
  const speedUnit = speedUnitFromDistance(distanceUnit);
  const [duration, setDuration] = useState(String(defaultDurationMin));
  const [distance, setDistance] = useState("");
  const [speed, setSpeed] = useState("");
  const [incline, setIncline] = useState("");
  const [resistance, setResistance] = useState("");
  const [hr, setHr] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const inflight = useRef(false);

  function nudgeDuration(dir: -1 | 1) {
    const current = parseNonNeg(duration) ?? 0;
    setDuration(String(Math.max(0, Math.round(current + dir))));
    setHint(null);
  }

  function nudgeDistance(dir: -1 | 1) {
    const current = parseNonNeg(distance) ?? 0;
    setDistance(String(Math.max(0, Math.round((current + dir * 0.1) * 10) / 10)));
  }

  function nudgeSpeed(dir: -1 | 1) {
    const current = parseNonNeg(speed) ?? 0;
    setSpeed(String(Math.max(0, Math.round((current + dir * 0.1) * 10) / 10)));
  }

  function nudgeIncline(dir: -1 | 1) {
    const current = parseNonNeg(incline) ?? 0;
    setIncline(String(Math.max(0, Math.round((current + dir * 0.5) * 2) / 2)));
  }

  function nudgeResistance(dir: -1 | 1) {
    const current = parseNonNeg(resistance) ?? 0;
    setResistance(String(Math.max(0, Math.round(current + dir))));
  }

  function nudgeHr(dir: -1 | 1) {
    const current = parseNonNeg(hr) ?? 0;
    setHr(String(Math.max(0, Math.round(current + dir))));
  }

  async function save() {
    if (inflight.current) return;
    const mins = parseNonNeg(duration);
    if (mins === null || mins < 1) {
      setHint("Enter a duration of at least 1 minute, or skip logging details.");
      return;
    }
    const bpm = parseNonNeg(hr);
    if (bpm !== null && (bpm < 30 || bpm > 230)) {
      setHint("Heart rate looks off — use a typical gym reading (30–230 bpm).");
      return;
    }

    inflight.current = true;
    setSaving(true);
    setHint(null);
    try {
      await onSave({
        activity,
        durationMin: mins,
        distance: parseNonNeg(distance),
        distanceUnit,
        inclinePct: parseNonNeg(incline),
        speed: parseNonNeg(speed),
        speedUnit,
        resistanceLevel: parseNonNeg(resistance),
        avgHrBpm: bpm,
        notes: notes.trim() === "" ? null : notes.trim(),
        loggedAt: new Date().toISOString(),
      });
    } finally {
      setSaving(false);
      inflight.current = false;
    }
  }

  async function skip() {
    if (!onSkip || inflight.current) return;
    inflight.current = true;
    setSaving(true);
    try {
      await onSkip();
    } finally {
      setSaving(false);
      inflight.current = false;
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <p className="text-[15px] font-semibold text-primary">{activity}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Duration (min)"
          value={duration}
          onChange={(v) => {
            setDuration(v);
            setHint(null);
          }}
          onNudge={nudgeDuration}
          inputMode="numeric"
          ariaInc="Increase duration by 1 minute"
          ariaDec="Decrease duration by 1 minute"
        />
        <Field
          label={`Distance (${distanceUnit})`}
          value={distance}
          onChange={setDistance}
          onNudge={nudgeDistance}
          inputMode="decimal"
          placeholder="optional"
          ariaInc={`Increase distance by 0.1 ${distanceUnit}`}
          ariaDec={`Decrease distance by 0.1 ${distanceUnit}`}
        />
        <Field
          label={`Speed (${speedUnit})`}
          value={speed}
          onChange={setSpeed}
          onNudge={nudgeSpeed}
          inputMode="decimal"
          placeholder="optional"
          ariaInc={`Increase speed by 0.1 ${speedUnit}`}
          ariaDec={`Decrease speed by 0.1 ${speedUnit}`}
        />
        <Field
          label="Incline level (%)"
          value={incline}
          onChange={setIncline}
          onNudge={nudgeIncline}
          inputMode="decimal"
          placeholder="optional"
          ariaInc="Increase incline by 0.5 percent"
          ariaDec="Decrease incline by 0.5 percent"
        />
        <Field
          label="Resistance"
          value={resistance}
          onChange={setResistance}
          onNudge={nudgeResistance}
          inputMode="numeric"
          placeholder="optional"
          ariaInc="Increase resistance by 1"
          ariaDec="Decrease resistance by 1"
        />
        <Field
          label="Avg HR (bpm)"
          value={hr}
          onChange={(v) => {
            setHr(v);
            setHint(null);
          }}
          onNudge={nudgeHr}
          inputMode="numeric"
          placeholder="optional"
          ariaInc="Increase heart rate by 1"
          ariaDec="Decrease heart rate by 1"
        />
      </div>
      <div>
        <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          Notes
        </p>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Intervals, machine, how it felt…"
          className="min-h-12 w-full rounded-lg border border-border-subtle bg-base px-3 text-[15px] text-primary placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-bold uppercase tracking-[0.08em] text-accent-foreground disabled:opacity-60"
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
          "Save cardio"
        )}
      </button>
      {skipLabel && onSkip ? (
        <button
          type="button"
          onClick={() => void skip()}
          disabled={saving}
          className="inline-flex min-h-11 w-full items-center justify-center text-[15px] font-medium text-secondary disabled:opacity-60"
        >
          {skipLabel}
        </button>
      ) : null}
      {hint ? (
        <p className="text-[13px] text-warning" role="status">
          {hint}
        </p>
      ) : (
        <p className="text-[13px] text-muted">
          Duration is required. Everything else is optional.
        </p>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  onNudge,
  inputMode,
  placeholder,
  ariaInc,
  ariaDec,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onNudge: (dir: -1 | 1) => void;
  inputMode: "numeric" | "decimal";
  placeholder?: string;
  ariaInc: string;
  ariaDec: string;
}) {
  return (
    <div>
      <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={() => onNudge(-1)}
          className="flex min-h-12 min-w-11 items-center justify-center rounded-lg border border-border-subtle bg-base text-secondary"
          aria-label={ariaDec}
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="text"
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="tabular min-h-12 min-w-0 flex-1 rounded-lg border border-border-subtle bg-base px-2 text-center font-mono text-[17px] font-semibold text-primary placeholder:font-sans placeholder:text-[13px] placeholder:font-normal placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onNudge(1)}
          className="flex min-h-12 min-w-11 items-center justify-center rounded-lg border border-border-subtle bg-base text-secondary"
          aria-label={ariaInc}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
