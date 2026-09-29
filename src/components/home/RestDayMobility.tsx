"use client";

import { ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { MobilityFormFigure } from "@/components/home/MobilityFormFigure";
import { MuscleMap } from "@/components/program/MuscleMap";
import {
  mobilityArt,
  mobilityForMuscles,
  type MobilitySuggestion,
} from "@/lib/program/mobility";
import type { MuscleGroup } from "@/lib/program/types";

export function RestDayMobility({ muscles }: { muscles: MuscleGroup[] }) {
  const suggestions = mobilityForMuscles(muscles);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = suggestions.find((s) => s.id === openId) ?? null;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="mt-6" data-testid="rest-day-mobility">
      <p className="mb-3 text-[15px] text-secondary">
        Recovery mobility matched to what you trained this week.
      </p>
      <ul className="flex flex-col gap-2">
        {suggestions.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              data-testid="mobility-suggestion"
              onClick={() => setOpenId(s.id)}
              className="flex w-full items-start gap-3 rounded-xl border border-border-subtle bg-base px-3 py-3 text-left"
            >
              <MobilityFormFigure
                id={s.id}
                phase="start"
                label={s.formLabels.start}
                title={s.title}
                compact
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-primary">
                  {s.title}
                </span>
                <span className="mt-1 block text-[13px] text-secondary">
                  {s.why}
                </span>
                <span className="mt-1 block text-[13px] text-muted">{s.how}</span>
              </span>
              <ChevronRight
                className="mt-1 h-4 w-4 shrink-0 text-muted"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
      {open ? (
        <MobilityDetail suggestion={open} onClose={() => setOpenId(null)} />
      ) : null}
    </div>
  );
}

function MobilityDetail({
  suggestion,
  onClose,
}: {
  suggestion: MobilitySuggestion;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-base/70 p-4 md:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobility-detail-title"
        data-testid="mobility-detail"
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border-subtle bg-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="mobility-detail-title"
            className="text-[18px] font-semibold text-primary"
          >
            {suggestion.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted hover:text-primary"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-[15px] text-secondary">{suggestion.why}</p>
        <p className="mt-1 text-[13px] text-muted">{suggestion.how}</p>

        <div className="mt-4">
          <h3 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Form — {suggestion.formLabels.start} → {suggestion.formLabels.finish}
            {suggestion.extraForm ? ` → ${suggestion.extraForm.label}` : ""}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <MobilityFormFigure
                id={suggestion.id}
                phase="start"
                label={suggestion.formLabels.start}
                title={suggestion.title}
              />
              {suggestion.formCaptions ? (
                <p className="mt-2 text-center text-[15px] leading-relaxed text-primary">
                  {suggestion.formCaptions.start}
                </p>
              ) : null}
            </div>
            <div>
              <MobilityFormFigure
                id={suggestion.id}
                phase="finish"
                label={suggestion.formLabels.finish}
                title={suggestion.title}
              />
              {suggestion.formCaptions ? (
                <p className="mt-2 text-center text-[15px] leading-relaxed text-primary">
                  {suggestion.formCaptions.finish}
                </p>
              ) : null}
            </div>
          </div>
          {suggestion.extraForm ? (
            <div className="mt-3">
              <div className="mx-auto w-1/2">
                <MobilityFormFigure
                  id={suggestion.id}
                  phase={suggestion.extraForm.slot}
                  label={suggestion.extraForm.label}
                  title={suggestion.title}
                />
              </div>
              <p className="mt-2 text-center text-[15px] leading-relaxed text-primary">
                {suggestion.extraForm.caption}
              </p>
            </div>
          ) : null}
        </div>

        {suggestion.tips.length > 0 ? (
          <div className="mt-4">
            <h3 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Form tips
            </h3>
            <ul className="flex flex-col gap-3">
              {suggestion.tips.map((tip) => (
                <li
                  key={tip.image}
                  className="overflow-hidden rounded-xl border border-border-subtle bg-base"
                >
                  <div className="form-anatomy relative aspect-[3/4] w-full">
                    <Image
                      src={mobilityArt(suggestion.id, tip.image)}
                      alt={`${suggestion.title}: ${tip.text}`}
                      fill
                      sizes="(max-width: 768px) 90vw, 420px"
                      className="object-contain"
                    />
                  </div>
                  <p className="px-3 py-3 text-[15px] leading-relaxed text-primary">
                    {tip.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4">
          <h3 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Muscles targeted
          </h3>
          <MuscleMap
            primary={suggestion.primary}
            secondary={suggestion.secondary}
          />
        </div>
      </div>
    </div>
  );
}
