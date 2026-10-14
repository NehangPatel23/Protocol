"use client";

import { useAlerts } from "@/components/alerts/AlertProvider";
import { PageHeader } from "@/components/PageHeader";
import { usePrefs } from "@/components/PrefsProvider";
import { useProgram } from "@/components/ProgramProvider";
import { DataBackupSection } from "@/components/settings/DataBackupSection";
import { SettingsScreenSkeleton } from "@/components/ui/ScreenLoading";
import { localDateKey } from "@/lib/db/history";
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

/** Read-only cycle/calendar dump for phone verification — never writes. */
function DebugCyclePanel() {
  const { cycle, calendar, ready } = useProgram();
  const today = localDateKey();
  const todayEntry = calendar[today] ?? null;

  if (!ready) return null;

  return (
    <details
      className="overflow-hidden rounded-xl border border-border-subtle bg-surface"
      data-testid="settings-debug"
    >
      <summary className="cursor-pointer list-none border-b border-border-subtle px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex w-full items-center justify-between gap-2">
          Debug
          <span className="text-[12px] font-normal normal-case tracking-normal text-secondary">
            read-only
          </span>
        </span>
      </summary>
      <div className="flex flex-col gap-3 px-4 py-3">
        <p className="text-[12px] text-secondary">
          Today ({today}). Values come from in-memory program state after boot —
          this panel does not read or write IndexedDB.
        </p>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            calendar[{today}]
          </p>
          <pre
            className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-base p-3 font-mono text-[11px] leading-relaxed text-secondary"
            data-testid="settings-debug-calendar"
          >
            {JSON.stringify(todayEntry, null, 2)}
          </pre>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            cycle
          </p>
          <pre
            className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-base p-3 font-mono text-[11px] leading-relaxed text-secondary"
            data-testid="settings-debug-cycle"
          >
            {JSON.stringify(cycle, null, 2)}
          </pre>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            completionRevert
          </p>
          <pre
            className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-base p-3 font-mono text-[11px] leading-relaxed text-secondary"
            data-testid="settings-debug-completion-revert"
          >
            {JSON.stringify(cycle.completionRevert ?? null, null, 2)}
          </pre>
        </div>
      </div>
    </details>
  );
}

export default function SettingsPage() {
  const { prefs, ready, setUnits } = usePrefs();
  const alerts = useAlerts();

  if (!ready) {
    return <SettingsScreenSkeleton />;
  }

  async function changeUnits(next: WeightUnit) {
    if (next === prefs.units) return;
    try {
      await setUnits(next);
      alerts.success(
        next === "lb" ? "Displaying weights in lbs" : "Displaying weights in kg",
        { title: "Units updated" },
      );
    } catch {
      alerts.danger("Couldn’t update units.", { title: "Save failed" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />

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
          <UnitToggle value={prefs.units} onChange={(u) => void changeUnits(u)} />
        </div>
      </section>

      <DataBackupSection />

      <DebugCyclePanel />
    </div>
  );
}
