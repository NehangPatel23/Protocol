"use client";

import Image from "next/image";
import { formPlate } from "@/lib/program/formArt";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/program/types";

export function FormPictogram({
  exerciseId,
  icon,
  name,
  primary,
  secondary = [],
}: {
  exerciseId: string;
  icon: string | null;
  name: string;
  primary: MuscleGroup[];
  secondary?: MuscleGroup[];
}) {
  const { art, labels } = formPlate(exerciseId, icon, primary);
  const targeted = [
    ...primary,
    ...secondary.filter((m) => !primary.includes(m)),
  ];

  return (
    <section className="rounded-xl border border-border-subtle bg-surface p-4">
      <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        Form — start → finish
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <FigureCard
          src={`/anatomy/form/${art}-start.webp`}
          label={labels.start}
          exerciseName={name}
        />
        <FigureCard
          src={`/anatomy/form/${art}-finish.webp`}
          label={labels.finish}
          exerciseName={name}
        />
      </div>
      {targeted.length > 0 ? (
        <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
          {targeted.map((m) => {
            const isPrimary = primary.includes(m);
            return (
              <li
                key={m}
                className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${
                  isPrimary
                    ? "bg-accent/15 text-accent"
                    : "bg-surface-raised text-muted"
                }`}
              >
                {MUSCLE_LABELS[m]}
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="mt-2 text-center text-[12px] text-muted">{name}</p>
    </section>
  );
}

function FigureCard({
  src,
  label,
  exerciseName,
}: {
  src: string;
  label: string;
  exerciseName: string;
}) {
  return (
    <div className="form-anatomy flex flex-col overflow-hidden rounded-lg">
      <div className="relative aspect-[3/4] w-full">
        <Image
          src={src}
          alt={`${exerciseName}, ${label.toLowerCase()} position`}
          fill
          sizes="(max-width: 768px) 45vw, 220px"
          className="object-contain"
        />
      </div>
      <span className="px-2 py-2 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
        {label}
      </span>
    </div>
  );
}
