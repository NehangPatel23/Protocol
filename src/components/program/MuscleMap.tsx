"use client";

import { useMemo } from "react";
import { MuscleMap as AnatomyFigure } from "js-rich-body-highlighter/react";
import { usePrefs } from "@/components/PrefsProvider";
import {
  ANATOMY_SHORT,
  anatomyHighlights,
} from "@/lib/program/anatomyHighlights";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/program/types";

interface MuscleMapProps {
  primary: MuscleGroup[];
  secondary?: MuscleGroup[];
  load: string;
  sets: string;
  reps: string;
  intensity: string;
}

export function MuscleMap({
  primary,
  secondary = [],
  load,
  sets,
  reps,
  intensity,
}: MuscleMapProps) {
  const { prefs } = usePrefs();
  const theme = prefs.theme === "light" ? "light" : "dark";
  const color = theme === "light" ? "#0f766e" : "#14b8a6";
  const primarySet = new Set(primary);
  const targeted = [
    ...primary,
    ...secondary.filter((m) => !primarySet.has(m)),
  ];
  const focus = targeted.map((m) => ANATOMY_SHORT[m]).join(" · ") || "—";
  const highlights = useMemo(
    () => anatomyHighlights(primary, secondary, color),
    [primary, secondary, color],
  );

  return (
    <div
      className="muscle-hud min-h-[300px]"
      role="img"
      aria-label={`Muscle map. Targeted: ${targeted.map((m) => MUSCLE_LABELS[m]).join(", ") || "none"}. Primary: ${primary.map((m) => MUSCLE_LABELS[m]).join(", ")}${
        secondary.length
          ? `. Secondary: ${secondary.map((m) => MUSCLE_LABELS[m]).join(", ")}`
          : ""
      }`}
    >
      <div className="pointer-events-none absolute left-3 top-2.5 z-10">
        <p className="font-mono text-[9px] font-semibold tracking-[0.18em] text-accent/80">
          MAP DETAIL
        </p>
        <p className="mt-0.5 max-w-[9rem] font-mono text-[9px] tracking-[0.12em] text-muted">
          {focus} FOCUS
        </p>
      </div>
      <div className="pointer-events-none absolute right-3 top-2.5 z-10 text-right">
        <p className="font-mono text-[9px] font-semibold tracking-[0.18em] text-accent/80">
          MUSCLE ACTIVITY
        </p>
      </div>

      <div className="flex items-end justify-center gap-2 px-12 pb-[4.75rem] pt-9">
        <div className="anatomy-host w-[42%] max-w-[168px]">
          <AnatomyFigure
            gender="male"
            view="front"
            theme={theme}
            width="100%"
            highlights={highlights}
            color={color}
            blendMode={theme === "dark" ? "screen" : "multiply"}
            hoverHighlight={false}
            bodySrc={`/anatomy/male-front-${theme}.webp`}
          />
        </div>
        <div className="anatomy-host w-[42%] max-w-[168px]">
          <AnatomyFigure
            gender="male"
            view="back"
            theme={theme}
            width="100%"
            highlights={highlights}
            color={color}
            blendMode={theme === "dark" ? "screen" : "multiply"}
            hoverHighlight={false}
            bodySrc={`/anatomy/male-back-${theme}.webp`}
          />
        </div>
      </div>

      <ul className="pointer-events-none absolute bottom-[4.5rem] left-2 z-10 flex flex-col gap-1.5 sm:left-3">
        {targeted.map((m) => {
          const isPrimary = primarySet.has(m);
          return (
            <li key={m} className="flex items-center gap-1.5">
              <span
                className="flex h-6 w-1 items-end rounded-full bg-accent/25"
                aria-hidden
              >
                <span
                  className="w-full rounded-full bg-accent"
                  style={{ height: isPrimary ? "100%" : "50%" }}
                />
              </span>
              <span className="font-mono text-[9px] font-semibold tracking-wider text-accent">
                {ANATOMY_SHORT[m]}
                <span className="ml-1 text-muted">
                  {isPrimary ? "100" : "50"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <dl className="pointer-events-none absolute bottom-[4.5rem] right-2 z-10 space-y-1 text-right font-mono text-[9px] tracking-wider sm:right-3">
        <div>
          <dt className="text-muted">LOAD</dt>
          <dd className="tabular font-semibold text-accent">{load}</dd>
        </div>
        <div>
          <dt className="text-muted">REPS</dt>
          <dd className="tabular font-semibold text-primary">{reps}</dd>
        </div>
        <div>
          <dt className="text-muted">SETS</dt>
          <dd className="tabular font-semibold text-primary">{sets}</dd>
        </div>
        <div>
          <dt className="text-muted">INTENSITY</dt>
          <dd className="font-semibold text-primary">{intensity}</dd>
        </div>
      </dl>

      <div className="absolute bottom-3 left-3 z-10 max-w-[78%] rounded-md border border-border-subtle/80 bg-base/90 px-2.5 py-1.5 backdrop-blur-sm">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
          Primary movers
        </p>
        <p className="text-[13px] font-semibold leading-snug text-primary">
          {targeted.map((m) => MUSCLE_LABELS[m]).join(", ") || "—"}
        </p>
      </div>
    </div>
  );
}
