"use client";

import { useEffect, useMemo, useState } from "react";
import { GlossaryTooltip } from "@/components/program/GlossaryTooltip";
import { usePrefs } from "@/components/PrefsProvider";
import {
  displayToKg,
  epley1RM,
  kgToDisplay,
  parseRepsFor1RM,
  topPrescribedKg,
  unitLabel,
} from "@/lib/program/format";
import type { WeightRange } from "@/lib/program/types";

interface OneRmProjectorProps {
  weight: WeightRange | "bodyweight";
  reps: string;
}

export function OneRmProjector({ weight, reps }: OneRmProjectorProps) {
  const { prefs } = usePrefs();
  const units = prefs.units;

  const preset = useMemo(() => {
    const kg = topPrescribedKg(weight);
    const r = parseRepsFor1RM(reps);
    return {
      displayWeight: kg === null ? "" : String(kgToDisplay(kg, units)),
      reps: r === null ? "" : String(r),
    };
  }, [weight, reps, units]);

  const [w, setW] = useState(preset.displayWeight);
  const [r, setR] = useState(preset.reps);

  useEffect(() => {
    setW(preset.displayWeight);
    setR(preset.reps);
  }, [preset.displayWeight, preset.reps]);

  const parsedW = Number(w);
  const parsedR = Number(r);
  const resultKg =
    Number.isFinite(parsedW) && parsedW >= 0 && Number.isFinite(parsedR)
      ? epley1RM(displayToKg(parsedW, units), parsedR)
      : null;
  const overCap = Number.isFinite(parsedR) && parsedR > 12;
  const resultDisplay =
    resultKg === null ? "—" : kgToDisplay(resultKg, units).toFixed(1);

  return (
    <section>
      <div className="mb-3 flex items-center gap-1">
        <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          1RM projector
        </h3>
        <GlossaryTooltip term="1rm" autoOpen={false} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Weight ({unitLabel(units)})
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={w}
            onChange={(e) => setW(e.target.value)}
            className="tabular min-h-11 w-full rounded-lg border border-border-subtle bg-base px-3 font-mono text-[15px] font-semibold text-primary focus:border-accent focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Reps
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={r}
            onChange={(e) => setR(e.target.value)}
            className="tabular min-h-11 w-full rounded-lg border border-border-subtle bg-base px-3 font-mono text-[15px] font-semibold text-primary focus:border-accent focus:outline-none"
          />
        </label>
      </div>
      <div className="mt-3 flex items-baseline justify-between rounded-lg bg-base px-3 py-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          {overCap ? "Theoretical (uncapped)" : "Theoretical"}
        </span>
        <span className="tabular text-[28px] font-bold leading-none text-primary">
          {overCap ? "—" : resultDisplay}
          {!overCap && resultKg !== null ? (
            <span className="ml-1 text-[13px] font-semibold text-muted">
              {unitLabel(units)}
            </span>
          ) : null}
        </span>
      </div>
      {overCap ? (
        <p className="mt-2 text-[13px] text-secondary">
          Epley is unreliable above 12 reps — high-rep work tracks top-set
          volume after you start logging.
        </p>
      ) : null}
    </section>
  );
}
