"use client";

import { usePrefs } from "@/components/PrefsProvider";
import type { WeightUnit } from "@/lib/db/schema";

function UnitToggle({
  value,
  onChange,
}: {
  value: WeightUnit;
  onChange: (u: WeightUnit) => void;
}) {
  const options: WeightUnit[] = ["lb", "kg"];
  return (
    <div
      className="inline-flex rounded-lg border border-border-subtle bg-base p-0.5"
      role="group"
      aria-label="Weight unit"
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`min-h-9 min-w-14 rounded-md px-3 text-[13px] font-semibold uppercase tracking-wide transition-colors duration-150 ${
              active
                ? "bg-accent text-accent-foreground"
                : "text-secondary hover:text-primary"
            }`}
            aria-pressed={active}
          >
            {opt === "lb" ? "lbs" : "kg"}
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const { prefs, ready, setUnits } = usePrefs();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[32px] font-bold leading-tight tracking-tight text-primary">
          Settings
        </h1>
      </header>

      <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
        <h2 className="border-b border-border-subtle px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Workout preferences
        </h2>
        <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-[15px] font-medium text-primary">Weight unit</p>
            <p className="text-[13px] text-secondary">
              Default display unit. Stored canonically in kg under the hood.
            </p>
          </div>
          {ready ? (
            <UnitToggle value={prefs.units} onChange={setUnits} />
          ) : (
            <span className="text-[13px] text-muted">Loading…</span>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border-subtle bg-surface px-4 py-6 text-center">
        <p className="text-[15px] text-secondary">
          Theme, rest timer, voice mode, and data tools arrive in a later phase.
        </p>
      </section>
    </div>
  );
}
