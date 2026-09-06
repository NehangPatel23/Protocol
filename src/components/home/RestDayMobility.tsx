"use client";

import { mobilityForMuscles } from "@/lib/program/mobility";
import type { MuscleGroup } from "@/lib/program/types";

export function RestDayMobility({ muscles }: { muscles: MuscleGroup[] }) {
  const suggestions = mobilityForMuscles(muscles);
  return (
    <div className="mt-6" data-testid="rest-day-mobility">
      <p className="mb-3 text-[15px] text-secondary">
        Recovery mobility matched to what you trained this week.
      </p>
      <ul className="flex flex-col gap-2">
        {suggestions.map((s) => (
          <li
            key={s.title}
            className="rounded-xl border border-border-subtle bg-base px-4 py-3"
            data-testid="mobility-suggestion"
          >
            <p className="text-[15px] font-semibold text-primary">{s.title}</p>
            <p className="mt-1 text-[13px] text-secondary">{s.why}</p>
            <p className="mt-1 text-[13px] text-muted">{s.how}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
