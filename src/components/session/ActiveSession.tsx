"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useAlerts } from "@/components/alerts/AlertProvider";
import { CardioLogger } from "@/components/program/CardioLogger";
import { SetLogger } from "@/components/program/SetLogger";
import { RestTimer } from "@/components/session/RestTimer";
import { usePrefs } from "@/components/PrefsProvider";
import { useProgram } from "@/components/ProgramProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { SessionScreenSkeleton } from "@/components/ui/ScreenLoading";
import { Spinner } from "@/components/ui/Spinner";
import { assignedExercisesForDay } from "@/lib/db/program";
import { formatCardioSummary } from "@/lib/db/cardio";
import {
  firstPrescribedKg,
  formatPrescription,
  kgToDisplay,
  parseRepsFor1RM,
  unitLabel,
} from "@/lib/program/format";
import { isCompoundMovement } from "@/lib/program/pills";
import { DAY_CHIP, DAY_LABELS } from "@/lib/program/days";
import {
  installSessionBackGuard,
  SESSION_LEAVE_PROMPT,
} from "@/lib/session/leaveGuard";
import { replaceRest, restDurationSec } from "@/lib/session/restTimer";
import { clampStep, sessionSteps } from "@/lib/session/steps";

export function ActiveSession() {
  const router = useRouter();
  const alerts = useAlerts();
  const { prefs } = usePrefs();
  const {
    program,
    history,
    cycle,
    ready,
    activeSession,
    logSet,
    deleteSet,
    logFinisherCardio,
    startSession,
    patchActiveSession,
    finishWorkout,
  } = useProgram();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [booting, setBooting] = useState(true);
  const bootRef = useRef(false);
  const leaveConfirmed = useRef(false);

  useEffect(() => {
    if (!ready || bootRef.current) return;
    bootRef.current = true;
    if (cycle.started !== true) {
      router.replace("/");
      return;
    }
    if (activeSession) {
      setBooting(false);
      return;
    }
    void startSession()
      .then(() => setBooting(false))
      .catch(() => {
        router.replace("/");
      });
  }, [activeSession, cycle.started, ready, router, startSession]);

  const hasSession = Boolean(activeSession);
  useEffect(() => {
    if (booting || !hasSession) return;
    return installSessionBackGuard({
      onPrompt: () => setLeaveOpen(true),
      isConfirmed: () => leaveConfirmed.current,
    });
  }, [booting, hasSession]);

  const lifts = useMemo(() => {
    if (!activeSession) return [];
    return assignedExercisesForDay(program, activeSession.dayKey);
  }, [activeSession, program]);

  const steps = useMemo(() => {
    if (!activeSession) return [];
    const dayAssignments = program.assignments[activeSession.dayKey] ?? [];
    return sessionSteps(lifts, dayAssignments);
  }, [activeSession, lifts, program.assignments]);
  const stepIndex = activeSession
    ? clampStep(activeSession.currentStep, steps.length)
    : 0;
  const step = steps[stepIndex];
  const chip = activeSession ? DAY_CHIP[activeSession.dayKey] : DAY_CHIP.push;

  async function goToStep(nextIndex: number) {
    if (!activeSession || steps.length === 0) return;
    await patchActiveSession({
      currentStep: clampStep(nextIndex, steps.length),
      restEndsAt: null,
      restDurationSec: null,
    });
  }

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    try {
      await finishWorkout();
      alerts.success("Day marked complete — pointer moved to the next session.", {
        title: "Workout finished",
      });
      router.replace("/");
    } catch {
      alerts.danger("Couldn’t finish this workout — it isn’t marked complete yet.", {
        title: "Save failed",
        durationMs: null,
        action: {
          label: "Retry",
          onClick: () => finish(),
        },
      });
      setFinishing(false);
    }
  }

  if (!ready || booting || !activeSession) {
    return <SessionScreenSkeleton />;
  }

  if (steps.length === 0 || !step) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-4">
        <EmptyState
          icon={Check}
          title="Nothing programmed"
          description="This day has no lifts or finisher to log."
          action={
            <button
              type="button"
              onClick={() => void finish()}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-5 text-[14px] font-bold uppercase tracking-[0.08em] text-accent-foreground"
            >
              Finish workout
            </button>
          }
        />
      </div>
    );
  }

  const units = prefs.units;
  const isLift = step.kind === "lift";
  const exercise = isLift ? step.row.exercise : null;
  const assignment = isLift ? step.row.assignment : null;
  const todayEntry =
    exercise && activeSession
      ? (history[exercise.id] ?? []).find((e) => e.date === activeSession.date)
      : undefined;
  const lastSet = exercise
    ? [...(history[exercise.id] ?? [])]
        .flatMap((e) => e.sets)
        .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))[0]
    : undefined;

  return (
    <div className="flex min-h-dvh flex-col bg-base">
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <button
            type="button"
            onClick={() => setLeaveOpen(true)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-accent"
            aria-label="Leave workout"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className={`font-mono text-[11px] font-semibold uppercase tracking-[0.14em] ${chip.text}`}>
              {DAY_LABELS[activeSession.dayKey]} · {stepIndex + 1}/{steps.length}
            </p>
            <p
              className="truncate text-[15px] font-semibold text-primary"
              data-testid="session-step-title"
            >
              {isLift ? exercise?.name : step.activity}
            </p>
          </div>
          <button
            type="button"
            data-testid="finish-workout"
            disabled={finishing}
            onClick={() => void finish()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-3 text-[12px] font-bold uppercase tracking-[0.08em] text-accent-foreground disabled:opacity-60"
          >
            {finishing ? (
              <Spinner
                size="sm"
                label="Finishing"
                className="border-accent-foreground/30 border-t-accent-foreground"
              />
            ) : (
              "Finish"
            )}
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-4">
        {isLift && exercise && assignment ? (
          <>
            <p className="tabular font-mono text-[15px] font-semibold text-accent">
              {formatPrescription(
                assignment.sets,
                assignment.reps,
                assignment.weight,
                units,
              )}
            </p>
            {assignment.warmup ? (
              <p className="text-[13px] text-muted">
                Warm-up {assignment.warmup.sets} × {assignment.warmup.reps}
              </p>
            ) : null}
            <SetLogger
              key={`${exercise.id}-${stepIndex}`}
              prType={exercise.prType}
              lastWeightKg={lastSet?.weightKg}
              lastReps={lastSet?.reps}
              prescribedWeightKg={firstPrescribedKg(assignment.weight)}
              prescribedReps={parseRepsFor1RM(assignment.reps)}
              hintText="Saves this set immediately — rest starts after."
              onLog={async (input) => {
                await logSet(exercise.id, {
                  ...input,
                  dayKey: activeSession.dayKey,
                  date: activeSession.date,
                });
                const duration = restDurationSec(
                  isCompoundMovement(exercise),
                  prefs.restTimerDefaults,
                );
                const rest = replaceRest(duration, Date.now());
                await patchActiveSession(rest);
              }}
            />
            {todayEntry && todayEntry.sets.length > 0 ? (
              <section className="rounded-xl border border-border-subtle bg-surface px-4 py-3">
                <h2 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  This session
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
                                      dayKey: activeSession.dayKey,
                                      date: activeSession.date,
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
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {activeSession.restEndsAt ? (
              <RestTimer
                endsAt={activeSession.restEndsAt}
                durationSec={activeSession.restDurationSec}
                onSkip={() => {
                  void patchActiveSession({
                    restEndsAt: null,
                    restDurationSec: null,
                  });
                }}
                onExtend={(nextEndsAt) => {
                  void patchActiveSession({ restEndsAt: nextEndsAt });
                }}
              />
            ) : null}
          </>
        ) : step.kind === "cardio" ? (
          <section className="rounded-xl border border-border-subtle bg-surface p-4">
            <h2 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Cardio finisher
            </h2>
            <p className="mb-4 text-[15px] text-secondary">
              Same logger as Program and sore-day recovery. Skip if you just
              want to mark the day done.
            </p>
            <CardioLogger
              activity={step.activity}
              defaultDurationMin={step.durationMin}
              skipLabel="Skip finisher"
              onSave={async (log) => {
                await logFinisherCardio(
                  activeSession.dayKey,
                  log,
                  activeSession.date,
                );
                alerts.success(formatCardioSummary(log), {
                  title: "Finisher saved",
                });
              }}
              onSkip={async () => {
                alerts.info("Finisher skipped — finish when you’re ready.");
              }}
            />
          </section>
        ) : null}

        <div className="mt-auto grid grid-cols-2 gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => void goToStep(stepIndex - 1)}
            className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl border border-border-subtle text-[13px] font-semibold uppercase tracking-[0.08em] text-secondary disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </button>
          <button
            type="button"
            disabled={stepIndex >= steps.length - 1}
            onClick={() => void goToStep(stepIndex + 1)}
            className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl border border-accent/40 text-[13px] font-semibold uppercase tracking-[0.08em] text-accent disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {leaveOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 p-4"
          role="presentation"
          onClick={() => setLeaveOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="leave-title"
            className="w-full max-w-sm rounded-2xl border border-border-subtle bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="leave-title" className="text-[18px] font-semibold text-primary">
              {SESSION_LEAVE_PROMPT}
            </h2>
            <p className="mt-2 text-[15px] text-secondary">
              You can resume from Home.
            </p>
            <button
              type="button"
              onClick={() => {
                leaveConfirmed.current = true;
                setLeaveOpen(false);
                router.push("/");
              }}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent text-[14px] font-bold uppercase tracking-[0.08em] text-accent-foreground"
            >
              Leave
            </button>
            <button
              type="button"
              onClick={() => setLeaveOpen(false)}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-[15px] font-medium text-secondary"
            >
              Stay
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
