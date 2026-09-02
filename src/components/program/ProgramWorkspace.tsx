"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Moon, Plus, Search } from "lucide-react";
import { MUSCLE_LABELS, type DayKey, type MuscleGroup } from "@/lib/program/types";
import { PageHeader } from "@/components/PageHeader";
import { CardioLogger } from "@/components/program/CardioLogger";
import { ExerciseDetail } from "@/components/program/ExerciseDetail";
import { ExercisePills } from "@/components/program/ExercisePills";
import { MusclePills } from "@/components/program/MusclePills";
import { useAlerts } from "@/components/alerts/AlertProvider";
import { usePrefs } from "@/components/PrefsProvider";
import { useProgram } from "@/components/ProgramProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgramScreenSkeleton } from "@/components/ui/ScreenLoading";
import { formatCardioSummary } from "@/lib/db/cardio";
import { assignedExercisesForDay } from "@/lib/db/program";
import {
  CYCLE_DAYS,
  DAY_CHIP,
  DAY_ICONS,
  DAY_LABELS,
  DAY_SUBTITLES,
  resolveProgramDay,
} from "@/lib/program/days";
import {
  formatPrescription,
  formatWeightValue,
} from "@/lib/program/format";

interface ProgramWorkspaceProps {
  selectedId?: string;
  dayFromUrl?: string;
  slotFromUrl?: string;
}

function cycleFor(programCycle: DayKey[]): DayKey[] {
  return programCycle.length >= 7 ? programCycle : CYCLE_DAYS;
}

function parseSlot(
  raw: string | undefined,
  cycle: DayKey[],
  day: DayKey,
  pointerFallback?: number,
): number {
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (
      Number.isInteger(n) &&
      n >= 0 &&
      n < cycle.length &&
      cycle[n] === day
    ) {
      return n;
    }
  }
  if (
    pointerFallback != null &&
    pointerFallback >= 0 &&
    pointerFallback < cycle.length &&
    cycle[pointerFallback] === day
  ) {
    return pointerFallback;
  }
  const first = cycle.findIndex((k) => k === day);
  return first === -1 ? 0 : first;
}

function dayHref(key: DayKey, index: number, selectedId?: string): string {
  const q = new URLSearchParams({ day: key, slot: String(index) });
  return selectedId
    ? `/program/${selectedId}?${q.toString()}`
    : `/program?${q.toString()}`;
}

function matchesQuery(
  name: string,
  equipment: string,
  primary: MuscleGroup[],
  secondary: MuscleGroup[] | undefined,
  query: string,
): boolean {
  if (!query) return true;
  const hay = [
    name,
    equipment,
    ...primary.map((m) => MUSCLE_LABELS[m]),
    ...(secondary ?? []).map((m) => MUSCLE_LABELS[m]),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(query);
}

export function ProgramWorkspace({
  selectedId,
  dayFromUrl,
  slotFromUrl,
}: ProgramWorkspaceProps) {
  const { program, ready, logFinisherCardio, cycle } = useProgram();
  const { prefs } = usePrefs();
  const alerts = useAlerts();
  const order = cycleFor(program.cycleOrder);
  const day: DayKey = resolveProgramDay(
    dayFromUrl,
    order,
    cycle.pointerIndex,
  );
  const activeSlot = parseSlot(
    slotFromUrl,
    order,
    day,
    dayFromUrl ? undefined : cycle.pointerIndex,
  );
  const [query, setQuery] = useState("");
  const [finisherOpen, setFinisherOpen] = useState(false);

  const rows = useMemo(() => {
    const list = assignedExercisesForDay(program, day);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(({ exercise }) =>
      matchesQuery(
        exercise.name,
        exercise.equipment,
        exercise.muscles.primary,
        exercise.muscles.secondary,
        q,
      ),
    );
  }, [program, day, query]);

  const finishers = useMemo(() => {
    const seen = new Set<string>();
    return assignedExercisesForDay(program, day)
      .map(({ assignment }) => assignment.cardioFinisher)
      .filter((f): f is NonNullable<typeof f> => {
        if (!f) return false;
        const key = `${f.activity}-${f.durationMin}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [program, day]);

  if (!ready) {
    return <ProgramScreenSkeleton />;
  }

  const listPane = (
    <div className="flex flex-col">
      <PageHeader
        title="Program"
        trailing={
          <Link
            href="/program/add"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-accent"
            aria-label="Add exercise or workout"
          >
            <Plus className="h-6 w-6" />
          </Link>
        }
      />

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Active routine
      </p>
      <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {order.map((key, i) => {
          const selected = i === activeSlot;
          const Icon = DAY_ICONS[key];
          const chip = DAY_CHIP[key];
          const restIndex =
            key === "rest"
              ? order.slice(0, i + 1).filter((k) => k === "rest").length
              : 0;
          return (
            <Link
              key={`${key}-${i}`}
              href={dayHref(key, i, selectedId)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold uppercase tracking-wide transition-colors duration-150 ${
                selected
                  ? `${chip.border} ${chip.bg} ${chip.text}`
                  : "border-transparent bg-surface-raised text-muted"
              }`}
              aria-current={selected ? "true" : undefined}
              aria-label={
                key === "rest" ? `Rest ${restIndex} of 2` : DAY_LABELS[key]
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${selected ? chip.dot : "bg-muted"}`}
                aria-hidden
              />
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {DAY_LABELS[key]}
            </Link>
          );
        })}
      </div>

      <p className="mb-1 text-[13px] text-secondary">{DAY_SUBTITLES[day]}</p>

      {day !== "rest" ? (
        <label className="relative mb-4 block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <span className="sr-only">
            Search this day by name, muscle, or equipment
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, muscle, equipment"
            className="min-h-11 w-full rounded-xl border border-border-subtle bg-surface py-2 pl-9 pr-3 text-[15px] text-primary placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>
      ) : null}

      {day !== "rest" ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Volume details
        </p>
      ) : null}

      {day === "rest" ? (
        <EmptyState
          icon={Moon}
          title="Rest day"
          description="No programmed lifts. Recovery mobility suggestions live on Home."
          className="py-14"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Search}
          title={query ? "No matches" : "Nothing programmed"}
          description={
            query
              ? "No exercises match that filter on this day. Try another search or clear the filter."
              : "No exercises are programmed for this day yet."
          }
          className="py-10"
        />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
          {rows.map(({ exercise, assignment }, i) => {
            const active = selectedId === exercise.id;
            return (
              <li
                key={`${exercise.id}-${i}`}
                className={i > 0 ? "border-t border-border-subtle" : undefined}
              >
                <Link
                  href={`/program/${exercise.id}?day=${day}`}
                  className={`block px-4 py-3.5 transition-colors duration-150 ${
                    active ? "bg-surface-raised" : "hover:bg-surface-raised/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[18px] font-semibold leading-snug text-primary">
                        {exercise.name}
                      </p>
                      <ExercisePills
                        className="mt-1.5"
                        exercise={exercise}
                        extraText={[
                          ...(assignment.sessionCues ?? []),
                          ...(assignment.sessionMistakes ?? []),
                          assignment.sessionNote ?? "",
                          assignment.alternativeNote ?? "",
                        ]}
                        size="sm"
                      />
                      <MusclePills
                        className="mt-1.5"
                        primary={exercise.muscles.primary}
                        secondary={exercise.muscles.secondary}
                        extra={
                          assignment.isSecondSession ? ["2nd session"] : []
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="tabular inline-block rounded-lg bg-base px-2.5 py-1 font-mono text-[13px] font-semibold text-accent">
                      {formatPrescription(
                        assignment.sets,
                        assignment.reps,
                        assignment.weight,
                        prefs.units,
                      )}
                    </span>
                    {assignment.warmup ? (
                      <span className="tabular text-[12px] text-muted">
                        WU {assignment.warmup.sets} × {assignment.warmup.reps} @{" "}
                        {formatWeightValue(assignment.warmup.weight, prefs.units)}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {finishers.length > 0 ? (
        <div className="mt-3 rounded-xl border border-border-subtle bg-surface px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Cardio finisher
          </p>
          {finishers.map((f) => (
            <p key={f.activity} className="mt-1 text-[15px] text-primary">
              {f.activity}
              <span className="tabular text-secondary"> · {f.durationMin} min</span>
            </p>
          ))}
          <button
            type="button"
            onClick={() => setFinisherOpen(true)}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-accent/40 text-[13px] font-semibold uppercase tracking-[0.08em] text-accent"
          >
            Log finisher
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
    <div className="md:grid md:grid-cols-[minmax(280px,400px)_1fr] md:items-start md:gap-8">
      <div
        className={`${selectedId ? "hidden md:block" : ""} md:sticky md:top-4 md:max-h-[calc(100dvh-2rem)] md:overflow-y-auto`}
      >
        {listPane}
      </div>
      {selectedId ? (
        <div className="md:sticky md:top-4 md:max-h-[calc(100dvh-2rem)] md:overflow-y-auto">
          <ExerciseDetail exerciseId={selectedId} dayKey={day} />
        </div>
      ) : (
        <div className="hidden min-h-[40dvh] items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface px-6 text-center md:flex">
          <p className="max-w-sm text-[15px] text-secondary">
            Select an exercise to read form cues, the muscle map, and your notes.
          </p>
        </div>
      )}
    </div>
    {finisherOpen && finishers[0] ? (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-base/70 p-4 md:items-center"
        role="presentation"
        onClick={() => setFinisherOpen(false)}
      >
        <div
          role="dialog"
          aria-labelledby="finisher-title"
          className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="finisher-title" className="mb-4 text-[18px] font-semibold text-primary">
            Log cardio finisher
          </h2>
          <CardioLogger
            activity={finishers[0].activity}
            defaultDurationMin={finishers[0].durationMin}
            onSave={async (log) => {
              await logFinisherCardio(day, log);
              setFinisherOpen(false);
              alerts.success(formatCardioSummary(log), {
                title: "Finisher saved",
              });
            }}
          />
        </div>
      </div>
    ) : null}
    </>
  );
}
