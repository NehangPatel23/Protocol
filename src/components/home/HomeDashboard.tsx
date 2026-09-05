"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bandage, Check, Dumbbell, Play, SlidersHorizontal } from "lucide-react";
import { CardioLogger } from "@/components/program/CardioLogger";
import { useAlerts } from "@/components/alerts/AlertProvider";
import { PageHeader } from "@/components/PageHeader";
import { usePrefs } from "@/components/PrefsProvider";
import { useProgram } from "@/components/ProgramProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { HomeScreenSkeleton } from "@/components/ui/ScreenLoading";
import { WeekStrip } from "@/components/home/WeekCell";
import { formatCardioSummary, type CardioLog } from "@/lib/db/cardio";
import { assignedExercisesForDay } from "@/lib/db/program";
import { localDateKey, type HistoryEntry } from "@/lib/db/history";
import {
  canRevertRecovery,
  isMissedPickup,
  mondayOfWeek,
} from "@/lib/program/cycle";
import { CYCLE_DAYS, DAY_CHIP, DAY_ICONS, DAY_LABELS, DAY_SUBTITLES } from "@/lib/program/days";
import {
  formatPrescription,
  parseRepsFor1RM,
  topPrescribedKg,
} from "@/lib/program/format";
import {
  MUSCLE_LABELS,
  type DayKey,
  type LibraryExercise,
  type MuscleGroup,
  type ProgramRecord,
} from "@/lib/program/types";

const MUSCLE_DOT: Record<MuscleGroup, string> = {
  chest: "bg-day-lower-fg",
  back: "bg-day-pull-fg",
  shoulders: "bg-warning",
  triceps: "bg-day-upper-fg",
  biceps: "bg-day-push-fg",
  quads: "bg-day-legs-fg",
  hamstrings: "bg-day-rest-fg",
  glutes: "bg-danger",
  calves: "bg-info",
  core: "bg-success",
  forearms: "bg-muted",
};

function parseSetCount(sets: number | string): number {
  if (typeof sets === "number") return sets;
  const m = String(sets).match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

function prescribedVolumeKg(program: ProgramRecord, day: DayKey): number {
  let total = 0;
  for (const { assignment } of assignedExercisesForDay(program, day)) {
    const sets = parseSetCount(assignment.sets);
    const reps = parseRepsFor1RM(assignment.reps) ?? 0;
    const kg = topPrescribedKg(assignment.weight) ?? 0;
    total += sets * reps * kg;
  }
  return total;
}

function formatVolume(kg: number, units: "kg" | "lb"): string {
  const n = units === "lb" ? kg * 2.2046226218 : kg;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function lastTrainedByMuscle(
  program: ProgramRecord,
  history: Record<string, HistoryEntry[]>,
): Partial<Record<MuscleGroup, string>> {
  const last: Partial<Record<MuscleGroup, string>> = {};
  for (const [id, entries] of Object.entries(history)) {
    const exercise: LibraryExercise | undefined = program.exercises[id];
    if (!exercise) continue;
    for (const entry of entries) {
      const groups = [
        ...exercise.muscles.primary,
        ...(exercise.muscles.secondary ?? []),
      ];
      for (const g of groups) {
        if (!last[g] || entry.date > last[g]!) last[g] = entry.date;
      }
    }
  }
  return last;
}

function primaryMusclesForDay(
  program: ProgramRecord,
  day: DayKey,
): MuscleGroup[] {
  const seen = new Set<MuscleGroup>();
  const order: MuscleGroup[] = [];
  for (const { exercise } of assignedExercisesForDay(program, day)) {
    for (const m of exercise.muscles.primary) {
      if (seen.has(m)) continue;
      seen.add(m);
      order.push(m);
    }
  }
  return order;
}

/** Training day immediately before the current pointer (skips Rest). */
function previousTrainingDay(
  cycleOrder: DayKey[],
  pointerIndex: number,
): DayKey | null {
  const n = cycleOrder.length;
  if (n === 0) return null;
  for (let i = 1; i <= n; i++) {
    const key = cycleOrder[(pointerIndex - i + n) % n];
    if (key && key !== "rest") return key;
  }
  return null;
}

/** Primary muscles from the most recent logged session before today. */
function musclesFromLastSessionBefore(
  program: ProgramRecord,
  history: Record<string, HistoryEntry[]>,
  today: string,
): MuscleGroup[] {
  let latest: string | null = null;
  for (const entries of Object.values(history)) {
    for (const entry of entries) {
      if (entry.date >= today) continue;
      if (!latest || entry.date > latest) latest = entry.date;
    }
  }
  if (!latest) return [];
  const seen = new Set<MuscleGroup>();
  const order: MuscleGroup[] = [];
  for (const [id, entries] of Object.entries(history)) {
    const exercise: LibraryExercise | undefined = program.exercises[id];
    if (!exercise) continue;
    if (!entries.some((e) => e.date === latest)) continue;
    for (const m of exercise.muscles.primary) {
      if (seen.has(m)) continue;
      seen.add(m);
      order.push(m);
    }
  }
  return order;
}

function recoveringFocusMuscles(
  program: ProgramRecord,
  history: Record<string, HistoryEntry[]>,
  today: string,
  pointerIndex: number,
): MuscleGroup[] {
  const fromHistory = musclesFromLastSessionBefore(program, history, today);
  if (fromHistory.length) return fromHistory;
  const order =
    program.cycleOrder.length >= 7 ? program.cycleOrder : CYCLE_DAYS;
  const prev = previousTrainingDay(order, pointerIndex);
  return prev ? primaryMusclesForDay(program, prev) : [];
}

function recoveryRows(
  program: ProgramRecord,
  history: Record<string, HistoryEntry[]>,
  today: string,
  mode: "focus" | "all",
  focusMuscles?: MuscleGroup[],
): { muscle: MuscleGroup; daysAgo: number | null }[] {
  const last = lastTrainedByMuscle(program, history);
  const trained = (Object.entries(last) as [MuscleGroup, string][])
    .map(([muscle, date]) => ({
      muscle,
      daysAgo: daysBetween(date, today),
    }))
    .sort((a, b) => (a.daysAgo ?? 99) - (b.daysAgo ?? 99));

  if (mode === "all") {
    const seen = new Set(trained.map((t) => t.muscle));
    const rest = (Object.keys(MUSCLE_LABELS) as MuscleGroup[])
      .filter((m) => !seen.has(m))
      .map((muscle) => ({ muscle, daysAgo: null as number | null }));
    return [...trained, ...rest];
  }

  if (focusMuscles && focusMuscles.length > 0) {
    return focusMuscles.map((muscle) => ({
      muscle,
      daysAgo: last[muscle] ? daysBetween(last[muscle]!, today) : null,
    }));
  }

  if (trained.length >= 4) return trained.slice(0, 4);

  const fallback: MuscleGroup[] = ["chest", "back", "quads", "shoulders"];
  const seen = new Set(trained.map((t) => t.muscle));
  const padded: { muscle: MuscleGroup; daysAgo: number | null }[] = [
    ...trained,
  ];
  for (const m of fallback) {
    if (padded.length >= 4) break;
    if (seen.has(m)) continue;
    padded.push({ muscle: m, daysAgo: null });
  }
  return padded;
}

function agoLabel(daysAgo: number | null): string {
  if (daysAgo === null) return "Not logged yet";
  if (daysAgo <= 0) return "today";
  if (daysAgo === 1) return "1d ago";
  return `${daysAgo}d ago`;
}

export function HomeDashboard() {
  const {
    program,
    history,
    calendar,
    soreness,
    cycle,
    todayKey,
    todaySlot,
    ready,
    logRecoveryDay,
    revertRecoveryDay,
    startProgramToday,
    activeSession,
    startSession,
  } = useProgram();
  const { prefs } = usePrefs();
  const alerts = useAlerts();
  const router = useRouter();
  const [soreOpen, setSoreOpen] = useState(false);
  const [cardioOpen, setCardioOpen] = useState(false);
  const [savingSore, setSavingSore] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const startSessionLock = useRef(false);
  const [panel, setPanel] = useState<"recovery" | "all" | "lifts">("recovery");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const today = localDateKey();
  const chip = DAY_CHIP[todayKey];
  const DayIcon = DAY_ICONS[todayKey];
  const isRest = todayKey === "rest";
  const missed = isMissedPickup(cycle, today, todayKey);
  const lifts = assignedExercisesForDay(program, todayKey);
  const volumeKg = prescribedVolumeKg(program, todayKey);
  const todayRecovery = calendar[today]?.status === "recovery";
  const todayCompleted = calendar[today]?.status === "completed";
  const todaySettled =
    calendar[today] != null && calendar[today].status !== "blank";
  const canLiftAgain = canRevertRecovery(cycle, today) && todayRecovery;
  const todayCardio = soreness[today]?.cardioLogged ?? null;
  const recoveringMuscles = useMemo(
    () =>
      todayRecovery
        ? recoveringFocusMuscles(
            program,
            history,
            today,
            cycle.pointerIndex,
          )
        : [],
    [todayRecovery, program, history, today, cycle.pointerIndex],
  );
  const recovery = useMemo(
    () =>
      recoveryRows(
        program,
        history,
        today,
        panel === "all" ? "all" : "focus",
        todayRecovery ? recoveringMuscles : undefined,
      ),
    [program, history, today, panel, todayRecovery, recoveringMuscles],
  );
  const weekStart = mondayOfWeek(today);

  useEffect(() => {
    if (!filterOpen) return;
    function onPointer(event: MouseEvent) {
      if (!filterRef.current?.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setFilterOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  const todayFinisher = lifts
    .map(({ assignment }) => assignment.cardioFinisher)
    .find((f): f is NonNullable<typeof f> => Boolean(f));
  const recoveryCardioActivity = todayFinisher?.activity ?? "Light cardio";
  const recoveryCardioDuration = todayFinisher?.durationMin ?? 15;

  async function commitRecovery(cardio: CardioLog | null) {
    setSavingSore(true);
    try {
      await logRecoveryDay(cardio);
      setCardioOpen(false);
      setSoreOpen(false);
      setPanel("recovery");
      alerts.info(
        cardio ? formatCardioSummary(cardio) : `${DAY_LABELS[todayKey]} moved to tomorrow.`,
        {
          title: "Active recovery logged",
        },
      );
    } catch {
      alerts.danger("Couldn’t log active recovery.", {
        title: "Save failed",
        durationMs: null,
        action: {
          label: "Retry",
          onClick: () => commitRecovery(cardio),
        },
      });
    } finally {
      setSavingSore(false);
    }
  }

  async function backToLifts() {
    setSavingSore(true);
    try {
      await revertRecoveryDay();
      setPanel("lifts");
      alerts.success("Back to lifting — start your session when ready.");
    } catch {
      alerts.danger("Couldn’t reverse recovery.", {
        title: "Save failed",
      });
    } finally {
      setSavingSore(false);
    }
  }

  async function goToSession() {
    if (startSessionLock.current) return;
    startSessionLock.current = true;
    setStartingSession(true);
    try {
      await startSession();
      router.push("/session");
      // Keep the lock on success so a second tap cannot fire while Home
      // is still mounted during navigation.
    } catch {
      startSessionLock.current = false;
      setStartingSession(false);
      alerts.danger("Couldn’t start the session.", {
        title: "Save failed",
      });
    }
  }

  if (!ready) {
    return <HomeScreenSkeleton />;
  }

  if (cycle.started !== true) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Home" priority />
        <EmptyState
          icon={Play}
          title="Ready when you are"
          description="Nothing is scheduled and no days are tagged missed until you begin. Start on today’s date — the cycle pointer takes it from there."
          action={
            <button
              type="button"
              disabled={starting}
              onClick={() => {
                setStarting(true);
                void startProgramToday()
                  .catch((err) => {
                    console.error("[protocol] startProgramToday failed", err);
                    alerts.danger("Couldn’t start the program.", {
                      title: "Save failed",
                    });
                  })
                  .finally(() => setStarting(false));
              }}
              className="inline-flex min-h-12 min-w-[220px] items-center justify-center rounded-xl bg-accent px-5 text-[14px] font-bold uppercase tracking-[0.08em] text-accent-foreground disabled:opacity-60"
            >
              Start my program today
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Home" priority />

      {missed && !todayRecovery ? (
        <aside
          role="status"
          className={`protocol-pending-banner relative flex items-center gap-3 overflow-hidden rounded-xl border border-border-subtle ${chip.bg} py-3 pl-4 pr-4`}
        >
          <span
            className={`absolute inset-y-2.5 left-2 w-1 rounded-full ${chip.dot}`}
            aria-hidden
          />
          <span
            className={`relative ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-base/70 ${chip.text}`}
            aria-hidden
          >
            <DayIcon className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Catching up
            </p>
            <p className="mt-0.5 text-[14px] font-medium leading-snug text-primary">
              Picking up your missed{" "}
              <span className={chip.text}>{DAY_LABELS[todayKey]}</span> day.
            </p>
          </div>
        </aside>
      ) : null}

      {todayRecovery ? (
        <p className="rounded-xl border border-accent/30 bg-success-bg px-4 py-3 text-[15px] text-success">
          Today is logged as active recovery. {DAY_LABELS[todayKey]} moves to
          tomorrow.
        </p>
      ) : null}

      <section
        className={`relative overflow-hidden rounded-xl border ${
          todayRecovery ? "border-accent/40" : chip.border
        } bg-surface px-5 py-6`}
      >
        <p className="text-[22px] font-bold leading-snug tracking-tight text-primary md:text-[26px]">
          {todayRecovery
            ? "Active Recovery"
            : isRest
              ? "Rest Day"
              : `${DAY_LABELS[todayKey]} Day`}
          <span className="mt-1 block text-[15px] font-medium text-secondary">
            {todayRecovery
              ? recoveringMuscles.length > 0
                ? recoveringMuscles.map((m) => MUSCLE_LABELS[m]).join(", ")
                : "Light cardio — let yesterday settle"
              : DAY_SUBTITLES[todayKey]}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {todayRecovery ? (
            <span className="rounded-md bg-base px-2.5 py-1 font-mono text-[12px] font-semibold text-accent">
              Recovery
            </span>
          ) : (
            <>
              {!isRest ? (
                <span className={`rounded-md bg-base px-2.5 py-1 font-mono text-[12px] font-semibold ${chip.text}`}>
                  {lifts.length} lift{lifts.length === 1 ? "" : "s"}
                </span>
              ) : null}
              {volumeKg > 0 ? (
                <span className={`rounded-md bg-base px-2.5 py-1 font-mono text-[12px] font-semibold ${chip.text}`}>
                  VOL {formatVolume(volumeKg, prefs.units)}
                </span>
              ) : null}
            </>
          )}
        </div>

        {isRest ? (
          <p className="mt-6 text-[15px] text-secondary">
            No programmed lifts. Recovery mobility matched to last week’s work
            will show here after you’ve logged a few sessions.
          </p>
        ) : todayRecovery ? (
          <div className="mt-6 flex flex-col gap-2">
            <p className="text-[15px] text-secondary">
              Light cardio is enough today — {DAY_LABELS[todayKey]} moved to
              tomorrow.
            </p>
            {todayCardio ? (
              <p className="font-mono text-[13px] text-accent">
                {formatCardioSummary(todayCardio)}
                {todayCardio.notes ? ` · ${todayCardio.notes}` : ""}
              </p>
            ) : null}
            <button
              type="button"
              disabled={savingSore || !canLiftAgain}
              onClick={() => void backToLifts()}
              className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 ${chip.border} ${chip.text} text-[14px] font-bold uppercase tracking-[0.08em] disabled:opacity-60`}
            >
              <Dumbbell className="h-5 w-5" aria-hidden />
              Back to today’s lifts
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-2">
            {todayCompleted && !activeSession ? (
              <p
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-bold uppercase tracking-[0.08em] text-accent-foreground"
                data-testid="workout-complete"
              >
                <Check className="h-5 w-5" aria-hidden />
                Workout complete
              </p>
            ) : (
              <button
                type="button"
                data-testid="start-session"
                disabled={startingSession}
                onClick={() => void goToSession()}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 ${chip.border} ${chip.text} text-[14px] font-bold uppercase tracking-[0.08em] disabled:opacity-60`}
              >
                <Play className="h-5 w-5 fill-current" aria-hidden />
                {activeSession ? "Resume session" : "Start session"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setPanel("lifts");
                document.getElementById("home-lifts")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 text-[14px] font-semibold text-secondary hover:text-primary"
            >
              <Dumbbell className="h-4 w-4" aria-hidden />
              Today’s lifts
            </button>
          </div>
        )}
      </section>

      {!isRest && !todaySettled ? (
        <button
          type="button"
          onClick={() => setSoreOpen(true)}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-warning/40 bg-warning-bg px-4 text-[14px] font-semibold text-warning"
        >
          <Bandage className="h-4 w-4" aria-hidden />
          Feeling sore from yesterday?
        </button>
      ) : null}

      <section>
        <h2 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          This week
        </h2>
        <WeekStrip weekStart={weekStart} today={today} calendar={calendar} />
      </section>

      <section id="home-lifts">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div
            className="inline-flex rounded-lg border border-border-subtle bg-base p-0.5"
            role="tablist"
            aria-label="Home list"
          >
            <button
              type="button"
              role="tab"
              aria-selected={panel !== "lifts"}
              className={`min-h-9 rounded-md px-3 text-[12px] font-semibold uppercase tracking-wide ${
                panel !== "lifts"
                  ? "bg-surface-raised text-primary"
                  : "text-muted"
              }`}
              onClick={() => setPanel("recovery")}
            >
              Recovery
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={panel === "lifts"}
              className={`min-h-9 rounded-md px-3 text-[12px] font-semibold uppercase tracking-wide ${
                panel === "lifts"
                  ? "bg-surface-raised text-primary"
                  : "text-muted"
              }`}
              onClick={() => setPanel("lifts")}
            >
              Today’s lifts
            </button>
          </div>
          {panel !== "lifts" ? (
            <div ref={filterRef} className="relative">
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted hover:text-primary"
                aria-label="Which muscles to show"
                aria-haspopup="menu"
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen((v) => !v)}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
              </button>
              {filterOpen ? (
                <ul
                  role="menu"
                  className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-border-subtle bg-surface-raised py-1 shadow-lg"
                >
                  {(
                    [
                      ["recovery", "Focus muscles"],
                      ["all", "All muscle groups"],
                    ] as const
                  ).map(([id, label]) => (
                    <li key={id} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-[15px] text-primary hover:bg-surface"
                        onClick={() => {
                          setPanel(id);
                          setFilterOpen(false);
                        }}
                      >
                        {label}
                        {panel === id ? (
                          <Check className="h-4 w-4 text-accent" aria-hidden />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <span className="min-h-11 min-w-11" aria-hidden />
          )}
        </div>
        <h2 className="sr-only">
          {panel === "lifts" ? "Today’s lifts" : "Muscle recovery"}
        </h2>
        {panel === "lifts" ? (
          lifts.length === 0 ? (
            <p className="rounded-xl bg-surface px-4 py-6 text-center text-[15px] text-secondary">
              No lifts programmed for {DAY_LABELS[todayKey]}.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
              {lifts.map(({ exercise, assignment }, i) => (
                <li
                  key={`${exercise.id}-${i}`}
                  className={i > 0 ? "border-t border-border-subtle" : undefined}
                >
                  <Link
                    href={`/program/${exercise.id}?day=${todayKey}&slot=${todaySlot}`}
                    className="block px-4 py-3 hover:bg-surface-raised/50"
                  >
                    <p className="text-[15px] font-semibold text-primary">
                      {exercise.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[13px] text-accent">
                      {formatPrescription(
                        assignment.sets,
                        assignment.reps,
                        assignment.weight,
                        prefs.units,
                      )}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {recovery.map((row) => (
              <li
                key={row.muscle}
                className="flex min-h-14 items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5"
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${MUSCLE_DOT[row.muscle]}`}
                  aria-hidden
                />
                <p className="min-w-0 text-[13px] font-medium text-primary">
                  {MUSCLE_LABELS[row.muscle]}
                  <span className="mt-0.5 block text-[12px] font-normal text-secondary">
                    {agoLabel(row.daysAgo)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {soreOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-base/70 p-4 md:items-center"
          role="presentation"
          onClick={() => setSoreOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="sore-title"
            className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="sore-title" className="text-[18px] font-semibold text-primary">
              Feeling sore from yesterday?
            </h2>
            <p className="mt-2 text-[15px] text-secondary">
              Soreness happens — light cardio helps you recover faster than
              sitting still. We’ll log today as active recovery and move{" "}
              {DAY_LABELS[todayKey]}’s workout to tomorrow.
            </p>
            <button
              type="button"
              disabled={savingSore}
              onClick={() => {
                setSoreOpen(false);
                setCardioOpen(true);
              }}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent text-[14px] font-bold uppercase tracking-[0.08em] text-accent-foreground disabled:opacity-60"
            >
              Log cardio instead
            </button>
            <button
              type="button"
              onClick={() => setSoreOpen(false)}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-[15px] font-medium text-secondary"
            >
              Never mind, I’ll lift
            </button>
          </div>
        </div>
      ) : null}

      {cardioOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-base/70 p-4 md:items-center"
          role="presentation"
          onClick={() => !savingSore && setCardioOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="cardio-title"
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="cardio-title" className="text-[18px] font-semibold text-primary">
              Log cardio
            </h2>
            <p className="mt-2 mb-4 text-[15px] text-secondary">
              Record what you did — or skip details and just mark today as
              active recovery.
            </p>
            <CardioLogger
              activity={recoveryCardioActivity}
              defaultDurationMin={recoveryCardioDuration}
              skipLabel="Skip, just mark it done"
              onSave={(log) => commitRecovery(log)}
              onSkip={() => commitRecovery(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
