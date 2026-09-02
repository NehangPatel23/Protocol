"use client";

import Link from "next/link";
import { ChevronLeft, Dumbbell, Trash2 } from "lucide-react";
import { useAlerts } from "@/components/alerts/AlertProvider";
import { CalloutCard } from "@/components/program/CalloutCard";
import { ExerciseOverflowMenu } from "@/components/program/ExerciseOverflowMenu";
import { ExercisePills } from "@/components/program/ExercisePills";
import { FormPictogram } from "@/components/program/FormPictogram";
import { GlossaryRow, GlossaryTooltip } from "@/components/program/GlossaryTooltip";
import { glossaryTermsFromCopy } from "@/lib/program/glossary";
import { MuscleMap } from "@/components/program/MuscleMap";
import { NotesField } from "@/components/program/NotesField";
import { OneRmProjector } from "@/components/program/OneRmProjector";
import { SetLogger } from "@/components/program/SetLogger";
import { YoutubeDemo } from "@/components/program/YoutubeDemo";
import { usePrefs } from "@/components/PrefsProvider";
import { useProgram } from "@/components/ProgramProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExerciseDetailSkeleton } from "@/components/ui/ScreenLoading";
import { assignmentOnDay } from "@/lib/db/program";
import {
  formatHistoryDate,
  localDateKey,
  type HistoryEntry,
  type HistorySet,
} from "@/lib/db/history";
import { DAY_LABELS, isDayKey } from "@/lib/program/days";
import {
  epley1RM,
  formatWeightValue,
  kgToDisplay,
  parseRepsFor1RM,
  firstPrescribedKg,
  unitLabel,
} from "@/lib/program/format";
import type { DayKey, PRType } from "@/lib/program/types";

function intensityLabel(tags?: string[]): string {
  if (tags?.includes("high-difficulty")) return "HIGH";
  if (tags?.includes("compound")) return "COMP";
  return "—";
}

function bestEst1RM(sets: HistorySet[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    const est = epley1RM(s.weightKg, s.reps);
    if (est == null) continue;
    if (best === null || est > best) best = est;
  }
  return best;
}

function setScheme(sets: HistorySet[]): string {
  const reps = sets.map((s) => s.reps);
  if (reps.length === 0) return "—";
  if (reps.every((r) => r === reps[0])) return `${sets.length} × ${reps[0]}`;
  return reps.join(" / ");
}

function topLoadKg(sets: HistorySet[], prType: PRType): number {
  const weights = sets.map((s) => s.weightKg);
  if (prType === "inverse-weight") return Math.min(...weights);
  return Math.max(...weights);
}

function lastThirtyDays(entries: HistoryEntry[]): HistoryEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const key = localDateKey(cutoff);
  return [...entries]
    .filter((e) => e.date >= key)
    .sort((a, b) => a.date.localeCompare(b.date));
}

interface ExerciseDetailProps {
  exerciseId: string;
  dayKey?: string;
}

export function ExerciseDetail({ exerciseId, dayKey }: ExerciseDetailProps) {
  const { program, notes, history, saveNote, logSet, deleteSet, daysFor, ready } =
    useProgram();
  const { prefs } = usePrefs();
  const alerts = useAlerts();
  const exercise = program.exercises[exerciseId];
  const assignedDays = daysFor(exerciseId);
  const requestedDay: DayKey | undefined = isDayKey(dayKey) ? dayKey : undefined;
  const day: DayKey | undefined =
    requestedDay && assignedDays.includes(requestedDay)
      ? requestedDay
      : assignedDays[0];
  const assignment =
    day && exercise ? assignmentOnDay(program, exerciseId, day) : undefined;

  if (!ready && !exercise) {
    return <ExerciseDetailSkeleton />;
  }

  if (!exercise) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Exercise not found"
        description="That exercise isn’t in the library — it may have been removed from your program."
        action={
          <Link
            href="/program"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 text-[15px] font-semibold text-accent-foreground"
          >
            Back to Program
          </Link>
        }
      />
    );
  }

  const cues = assignment?.sessionCues ?? exercise.cues;
  const mistakes = assignment?.sessionMistakes ?? exercise.mistakes;
  const programNote = assignment?.sessionNote ?? exercise.note;
  const alternativeId = assignment?.alternativeId ?? exercise.alternativeId;
  const alternativeNote =
    assignment?.alternativeNote ?? exercise.alternativeNote;
  const alternative = alternativeId
    ? program.exercises[alternativeId]
    : undefined;
  const alternativeDay = alternativeId
    ? daysFor(alternativeId)[0]
    : undefined;

  const units = prefs.units;
  const entries = history[exercise.id] ?? [];
  const todayKey = localDateKey();
  const todayEntry = entries.find((e) => e.date === todayKey);
  const allSets = entries.flatMap((e) => e.sets);
  const lastSet = allSets[0]
    ? [...allSets].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))[0]
    : undefined;
  const logged1RM = bestEst1RM(allSets);
  const prescribedKg = assignment ? firstPrescribedKg(assignment.weight) : null;
  const prescribedReps = assignment
    ? parseRepsFor1RM(assignment.reps)
    : null;
  const theoreticalKg =
    logged1RM ??
    (prescribedKg !== null && prescribedReps !== null
      ? epley1RM(prescribedKg, prescribedReps)
      : null);
  const backHref = isDayKey(dayKey) ? `/program?day=${dayKey}` : "/program";
  const recent = lastThirtyDays(entries);
  const chartMax = Math.max(
    ...recent.map((e) => bestEst1RM(e.sets) ?? topLoadKg(e.sets, exercise.prType)),
    0,
  );
  const glossaryTerms = glossaryTermsFromCopy(
    cues ?? [],
    mistakes ?? [],
    [programNote ?? "", alternativeNote ?? "", assignment?.reps ?? ""],
  );

  return (
    <article className="flex flex-col gap-4">
      <header>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
            Back to routine
          </Link>
          <ExerciseOverflowMenu
            exerciseName={exercise.name}
            alternative={
              alternative
                ? {
                    id: alternative.id,
                    name: alternative.name,
                    href: alternativeDay
                      ? `/program/${alternative.id}?day=${alternativeDay}`
                      : `/program/${alternative.id}`,
                  }
                : undefined
            }
            hasAlternativeNote={Boolean(alternativeNote)}
          />
        </div>

        <ExercisePills
          className="mb-3"
          exercise={exercise}
          extraText={[
            ...(cues ?? []),
            ...(mistakes ?? []),
            programNote ?? "",
            alternativeNote ?? "",
          ]}
        />
        {glossaryTerms.length > 0 ? (
          <div className="mb-3">
            <GlossaryRow terms={glossaryTerms} />
          </div>
        ) : null}

        <h1 className="text-[28px] font-bold uppercase leading-[1.1] tracking-tight text-primary md:text-[32px]">
          {exercise.name}
        </h1>
      </header>

      <div className="rounded-xl border border-accent px-4 py-5">
        <p className="inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          Estimated 1RM
          <GlossaryTooltip term="1rm" />
        </p>
        <p className="tabular mt-1 text-[32px] font-bold leading-none tracking-tight text-accent">
          {theoreticalKg === null
            ? "—"
            : `${kgToDisplay(theoreticalKg, units).toFixed(1)} ${unitLabel(units).toUpperCase()}`}
        </p>
        <p className="mt-2 text-[13px] text-secondary">
          {logged1RM !== null
            ? "From your logged sets (Epley, ≤12 reps)."
            : "Logs will replace this program estimate."}
        </p>
      </div>

      <SetLogger
        key={exercise.id}
        prType={exercise.prType}
        lastWeightKg={lastSet?.weightKg}
        lastReps={lastSet?.reps}
        prescribedWeightKg={prescribedKg}
        prescribedReps={prescribedReps}
        onLog={(input) => logSet(exercise.id, { ...input, dayKey: day })}
      />

      {todayEntry && todayEntry.sets.length > 0 ? (
        <section className="rounded-xl border border-border-subtle bg-surface px-4 py-3">
          <h2 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Today
          </h2>
          <ul>
            {todayEntry.sets.map((s, i) => (
              <li
                key={s.id}
                className="flex min-h-11 items-center justify-between gap-3 border-t border-border-subtle py-2 first:border-t-0"
              >
                <p className="tabular font-mono text-[15px] text-primary">
                  Set {i + 1}
                  <span className="ml-2 text-accent">
                    {s.weightKg === 0
                      ? "BW"
                      : `${kgToDisplay(s.weightKg, units)} ${unitLabel(units)}`}
                  </span>
                  <span className="text-secondary"> × {s.reps}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const snapshot = { ...s };
                    void (async () => {
                      try {
                        await deleteSet(exercise.id, s.id);
                        alerts.warning("Set removed", {
                          durationMs: 5000,
                          action: {
                            label: "Undo",
                            onClick: async () => {
                              await logSet(exercise.id, {
                                weightKg: snapshot.weightKg,
                                reps: snapshot.reps,
                                dayKey: day,
                              });
                              alerts.success("Set restored");
                            },
                          },
                        });
                      } catch {
                        alerts.danger("Couldn’t delete set.", {
                          title: "Delete failed",
                        });
                      }
                    })();
                  }}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-danger"
                  aria-label={`Delete set ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <MuscleMap
        primary={exercise.muscles.primary}
        secondary={exercise.muscles.secondary}
        load={
          assignment
            ? formatWeightValue(assignment.weight, units)
            : "—"
        }
        sets={assignment ? String(assignment.sets) : "—"}
        reps={assignment?.reps ?? "—"}
        intensity={intensityLabel(exercise.difficultyTags)}
      />

      <FormPictogram
        exerciseId={exercise.id}
        icon={exercise.icon}
        name={exercise.name}
        primary={exercise.muscles.primary}
        secondary={exercise.muscles.secondary}
      />

      <YoutubeDemo exerciseName={exercise.name} />

      <NotesField
        exerciseId={exercise.id}
        value={notes[exercise.id] ?? ""}
        onSave={saveNote}
      />

      {exercise.setup && exercise.setup.length > 0 ? (
        <section className="rounded-xl border border-border-subtle bg-surface px-4 py-3">
          <h2 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Setup
          </h2>
          <ul className="list-disc space-y-1 pl-4 text-[15px] text-secondary">
            {exercise.setup.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {programNote ? (
        <p className="rounded-xl border border-warning/30 bg-warning-bg px-4 py-3 text-[15px] text-warning">
          {programNote}
        </p>
      ) : null}

      {cues.length > 0 ? (
        <CalloutCard kind="cues">
          <ul className="list-disc space-y-1.5 pl-4 text-[15px] text-primary">
            {cues.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CalloutCard>
      ) : null}

      {mistakes.length > 0 ? (
        <CalloutCard kind="mistakes">
          <ul className="list-disc space-y-1.5 pl-4 text-[15px] text-primary">
            {mistakes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CalloutCard>
      ) : null}

      {alternative || alternativeNote ? (
        <CalloutCard kind="alternatives" id="alternatives">
          <ul className="space-y-2 text-[15px] text-primary">
            {alternative ? (
              <li>
                <Link
                  href={
                    alternativeDay
                      ? `/program/${alternative.id}?day=${alternativeDay}`
                      : `/program/${alternative.id}`
                  }
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  {alternative.name}
                </Link>
                {alternativeNote ? (
                  <p className="mt-1 text-secondary">{alternativeNote}</p>
                ) : null}
              </li>
            ) : alternativeNote ? (
              <li>{alternativeNote}</li>
            ) : null}
          </ul>
        </CalloutCard>
      ) : null}

      <section className="rounded-xl border border-border-subtle bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Progression matrix
          </h2>
          <span className="rounded-full border border-border-subtle px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-muted">
            Last 30 days
          </span>
        </div>
        {recent.length >= 1 ? (
          <div className="mb-4 flex min-h-28 items-end justify-between gap-1 px-1">
            {recent.map((entry, i) => {
              const value =
                bestEst1RM(entry.sets) ??
                topLoadKg(entry.sets, exercise.prType);
              const pct = chartMax > 0 ? Math.max(8, (value / chartMax) * 100) : 8;
              const latest = i === recent.length - 1;
              return (
                <div
                  key={entry.date}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end"
                >
                  {latest ? (
                    <span className="tabular mb-1 font-mono text-[9px] text-accent">
                      {kgToDisplay(value, units)}
                      {unitLabel(units)}
                    </span>
                  ) : null}
                  <span
                    className={`w-full max-w-6 rounded-t-sm ${latest ? "bg-accent" : "bg-surface-raised"}`}
                    style={{ height: `${pct * 0.9}px` }}
                    title={`${formatHistoryDate(entry.date)} · ${kgToDisplay(value, units)} ${unitLabel(units)}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mb-4 flex min-h-28 flex-col items-center justify-center rounded-lg bg-base px-4">
            <p className="text-center text-[13px] text-secondary">
              Not enough data yet — log a few more sessions
            </p>
          </div>
        )}

        {assignment ? (
          <OneRmProjector weight={assignment.weight} reps={assignment.reps} />
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[280px] text-left font-mono text-[12px]">
            <caption className="sr-only">Session history</caption>
            <thead>
              <tr className="border-b border-border-subtle text-[10px] uppercase tracking-[0.12em] text-muted">
                <th className="py-2 pr-2 font-medium">Date</th>
                <th className="py-2 pr-2 font-medium">Sets × reps</th>
                <th className="py-2 pr-2 font-medium">Top load</th>
                <th className="py-2 font-medium">Est. 1RM</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-center font-sans text-[13px] text-secondary"
                  >
                    No logged sets yet.
                  </td>
                </tr>
              ) : (
                [...entries]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 20)
                  .map((entry) => {
                    const load = topLoadKg(entry.sets, exercise.prType);
                    const est = bestEst1RM(entry.sets);
                    return (
                      <tr
                        key={entry.date}
                        className="border-b border-border-subtle last:border-b-0"
                      >
                        <td className="py-2.5 pr-2 text-secondary">
                          {formatHistoryDate(entry.date)}
                        </td>
                        <td className="py-2.5 pr-2 text-primary">
                          {setScheme(entry.sets)}
                        </td>
                        <td className="py-2.5 pr-2 text-accent">
                          {load === 0
                            ? "BW"
                            : `${kgToDisplay(load, units)} ${unitLabel(units)}`}
                        </td>
                        <td className="py-2.5 text-primary">
                          {est === null
                            ? "—"
                            : kgToDisplay(est, units).toFixed(1)}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {assignedDays.length > 1 ? (
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
          Also on {assignedDays.map((d) => DAY_LABELS[d]).join(" · ")}
        </p>
      ) : null}
    </article>
  );
}
