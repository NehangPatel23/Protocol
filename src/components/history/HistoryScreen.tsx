"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Check, ChevronLeft, ChevronRight, Leaf, Play, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { WeekCell } from "@/components/home/WeekCell";
import { usePrefs } from "@/components/PrefsProvider";
import { useProgram } from "@/components/ProgramProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { HistoryScreenSkeleton } from "@/components/ui/ScreenLoading";
import { loadCalendar } from "@/lib/db/cycle";
import {
  loadAllHistory,
  localDateKey,
  type HistoryEntry,
} from "@/lib/db/history";
import { loadAllSessions } from "@/lib/db/sessions";
import type { SessionRecord } from "@/lib/db/cardio";
import type { CalendarEntry } from "@/lib/program/cycle";
import { DAY_CHIP, DAY_LABELS } from "@/lib/program/days";
import { kgToDisplay, unitLabel } from "@/lib/program/format";
import {
  bestEst1RM,
  setScheme,
  topLoadKg,
} from "@/lib/program/loggedSets";
import type { ProgramRecord } from "@/lib/program/types";
import {
  addMonths,
  buildSessionList,
  formatSessionDate,
  monthGrid,
  monthTitle,
  MONTH_WEEKDAY_LABELS,
  sessionForDate,
  sessionsInMonth,
  type HistorySessionItem,
} from "@/lib/history/view";

export interface HistoryViewProps {
  calendar: Record<string, CalendarEntry>;
  history: Record<string, HistoryEntry[]>;
  sessions: Record<string, SessionRecord>;
  program: ProgramRecord;
  today: string;
  units: "kg" | "lb";
  year: number;
  monthIndex: number;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

/**
 * Presentational History. Data is passed in so tests can prove the grid
 * and list actually follow calendar / exerciseHistory rather than a shell.
 */
export function HistoryView({
  calendar,
  history,
  sessions,
  program,
  today,
  units,
  year,
  monthIndex,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: HistoryViewProps) {
  const cells = useMemo(() => monthGrid(year, monthIndex), [year, monthIndex]);
  const allSessions = useMemo(
    () => buildSessionList(calendar, history, sessions, program),
    [calendar, history, sessions, program],
  );
  const monthSessions = useMemo(
    () => sessionsInMonth(allSessions, year, monthIndex),
    [allSessions, year, monthIndex],
  );
  const selected = sessionForDate(allSessions, selectedDate);
  const selectedCal = selectedDate ? calendar[selectedDate] : undefined;
  const title = monthTitle(year, monthIndex);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="History" />

      <section aria-label="Training calendar">
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border-subtle bg-surface text-secondary hover:text-primary"
            aria-label="Previous month"
            onClick={onPrevMonth}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <h2 className="text-[18px] font-semibold text-primary">{title}</h2>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border-subtle bg-surface text-secondary hover:text-primary"
            aria-label="Next month"
            onClick={onNextMonth}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <p className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-accent text-accent-foreground">
              <Check className="h-3 w-3" aria-hidden />
            </span>
            Completed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-success-bg text-success">
              <Leaf className="h-3 w-3" aria-hidden />
            </span>
            Recovery
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-danger-bg text-danger">
              <X className="h-3 w-3" aria-hidden />
            </span>
            Missed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-4 w-4 rounded border-2 border-muted bg-transparent" />
            Rest
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-4 w-4 rounded bg-base" />
            Blank
          </span>
        </p>

        <ol className="mb-1.5 grid grid-cols-7 gap-1.5">
          {MONTH_WEEKDAY_LABELS.map((label, i) => (
            <li
              key={`${label}-${i}`}
              className="text-center font-mono text-[10px] font-semibold text-muted"
            >
              {label}
            </li>
          ))}
        </ol>
        <ol className="grid grid-cols-7 gap-1.5">
          {cells.map((cell, i) => (
            <li
              key={cell.date ?? `pad-${i}`}
              className="min-w-0 protocol-heatmap-cell"
              style={{ animationDelay: `${(i / 42) * 400}ms` }}
            >
              {cell.date && cell.dayNum != null ? (
                <WeekCell
                  date={cell.date}
                  label={cell.weekdayLabel}
                  dayNum={cell.dayNum}
                  isToday={cell.date === today}
                  entry={calendar[cell.date]}
                  layout="month"
                  selected={cell.date === selectedDate}
                  onSelect={(date) =>
                    onSelectDate(date === selectedDate ? null : date)
                  }
                />
              ) : (
                <div
                  className="aspect-square rounded-lg"
                  data-testid="week-cell-pad"
                  data-status="pad"
                  aria-hidden
                />
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Session log">
        <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Sessions · {title}
        </h2>

        {monthSessions.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No workouts this month"
            description="Blank days are just unused — not misses. Start today’s session from Home and it will show up here."
            action={
              <Link
                href="/"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
              >
                <Play className="h-4 w-4" aria-hidden />
                Start from Home
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {monthSessions.map((item) => (
              <li key={item.date}>
                <SessionRow
                  item={item}
                  selected={item.date === selectedDate}
                  onSelect={() =>
                    onSelectDate(item.date === selectedDate ? null : item.date)
                  }
                />
              </li>
            ))}
          </ul>
        )}

        {selectedDate ? (
          <div className="mt-4">
            <h3 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {formatSessionDate(selectedDate)}
            </h3>
            {selected ? (
              <SessionDetail item={selected} units={units} />
            ) : (
              <EmptyDayDetail
                status={selectedCal?.status}
                dayKey={selectedCal?.dayKey}
                date={selectedDate}
              />
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function EmptyDayDetail({
  status,
  dayKey,
  date,
}: {
  status: CalendarEntry["status"] | undefined;
  dayKey?: CalendarEntry["dayKey"];
  date: string;
}) {
  if (status === "missed") {
    const missedLabel = dayKey ? `Missed: ${DAY_LABELS[dayKey]}` : "Missed";
    return (
      <p
        className="rounded-xl border border-danger/30 bg-danger-bg px-4 py-5 text-[15px] text-danger"
        data-testid="history-empty-day"
      >
        <span className="font-semibold">{missedLabel}</span>
        {" — "}
        nothing was logged on {formatSessionDate(date)}.
      </p>
    );
  }
  if (status === "rest") {
    return (
      <p
        className="rounded-xl border border-border-subtle bg-surface px-4 py-5 text-[15px] text-secondary"
        data-testid="history-empty-day"
      >
        Rest day — nothing to log.
      </p>
    );
  }
  return (
    <p
      className="rounded-xl border border-border-subtle bg-surface px-4 py-5 text-[15px] text-secondary"
      data-testid="history-empty-day"
    >
      Nothing logged on {formatSessionDate(date)}.
    </p>
  );
}

function SessionRow({
  item,
  selected,
  onSelect,
}: {
  item: HistorySessionItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const dayName = item.dayKey ? DAY_LABELS[item.dayKey] : "Session";
  const chip = item.dayKey ? DAY_CHIP[item.dayKey] : null;
  const recovery = item.status === "recovery";
  const setCount = item.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`session-row-${item.date}`}
      aria-pressed={selected}
      className={`flex min-h-14 w-full flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-accent bg-surface-raised"
          : "border-border-subtle bg-surface hover:bg-surface-raised/60"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-secondary">
          {formatSessionDate(item.date)}
        </span>
        {recovery ? (
          <span className="rounded-md bg-success-bg px-2 py-0.5 text-[11px] font-semibold text-success">
            Active Recovery
          </span>
        ) : chip ? (
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${chip.bg} ${chip.text}`}
          >
            {dayName}
          </span>
        ) : null}
      </div>
      <p className="text-[15px] font-semibold text-primary">{dayName}</p>
      <p className="font-mono text-[12px] text-muted">
        {item.exercises.length > 0
          ? `${item.exercises.length} exercise${item.exercises.length === 1 ? "" : "s"} · ${setCount} set${setCount === 1 ? "" : "s"}`
          : recovery
            ? "Cardio swap — no lifts logged"
            : "No sets logged"}
        {item.durationMin != null ? ` · ${item.durationMin} min` : ""}
        {item.cardioActivity ? ` · ${item.cardioActivity}` : ""}
      </p>
    </button>
  );
}

function SessionDetail({
  item,
  units,
}: {
  item: HistorySessionItem;
  units: "kg" | "lb";
}) {
  const dayName = item.dayKey ? DAY_LABELS[item.dayKey] : "Session";
  const recovery = item.status === "recovery";

  return (
    <article
      className="overflow-hidden rounded-xl border border-border-subtle bg-surface"
      data-testid={`session-detail-${item.date}`}
    >
      <header className="border-b border-border-subtle px-4 py-3">
        <p className="text-[13px] text-secondary">
          {formatSessionDate(item.date)}
        </p>
        <h3 className="text-[18px] font-semibold text-primary">
          {recovery ? "Active Recovery" : dayName}
        </h3>
        {item.durationMin != null ? (
          <p className="mt-1 font-mono text-[12px] text-muted">
            {item.durationMin} min
            {item.cardioActivity ? ` · ${item.cardioActivity}` : ""}
          </p>
        ) : item.cardioActivity ? (
          <p className="mt-1 font-mono text-[12px] text-muted">
            {item.cardioActivity}
          </p>
        ) : null}
      </header>

      {item.exercises.length === 0 ? (
        <p className="px-4 py-6 text-[15px] text-secondary">
          {recovery
            ? "No lifts logged — this day was an active recovery swap."
            : "No sets logged this day."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[280px] text-left font-mono text-[12px]">
            <caption className="sr-only">Exercises logged this day</caption>
            <thead>
              <tr className="border-b border-border-subtle text-[10px] uppercase tracking-[0.12em] text-muted">
                <th className="px-4 py-2 pr-2 font-medium">Exercise</th>
                <th className="py-2 pr-2 font-medium">Sets × reps</th>
                <th className="py-2 pr-2 font-medium">Top load</th>
                <th className="py-2 pr-4 font-medium">Est. 1RM</th>
              </tr>
            </thead>
            <tbody>
              {item.exercises.map((ex) => {
                const load = topLoadKg(ex.sets, ex.prType);
                const est = bestEst1RM(ex.sets);
                return (
                  <tr
                    key={ex.exerciseId}
                    className="border-b border-border-subtle last:border-b-0"
                    data-testid={`session-exercise-${ex.exerciseId}`}
                  >
                    <td className="px-4 py-2.5 pr-2 font-sans text-[13px] text-primary">
                      {ex.name}
                    </td>
                    <td className="py-2.5 pr-2 text-primary">
                      {setScheme(ex.sets)}
                    </td>
                    <td className="py-2.5 pr-2 text-accent">
                      {load === 0
                        ? "BW"
                        : `${kgToDisplay(load, units)} ${unitLabel(units)}`}
                    </td>
                    <td className="py-2.5 pr-4 text-primary">
                      {est === null
                        ? "—"
                        : kgToDisplay(est, units).toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

/**
 * Loads calendar / history / sessions from IndexedDB on every visit.
 * ProgramProvider's boot snapshot is not enough: injecting a calendar
 * entry and navigating away/back must show the new data without a
 * full page reload.
 */
export function HistoryScreen() {
  const { program, ready } = useProgram();
  const { prefs } = usePrefs();
  const today = localDateKey();
  const [year, setYear] = useState(() => {
    const [y] = today.split("-").map(Number);
    return y;
  });
  const [monthIndex, setMonthIndex] = useState(() => {
    const parts = today.split("-").map(Number);
    return (parts[1] ?? 1) - 1;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<Record<string, CalendarEntry>>({});
  const [history, setHistory] = useState<Record<string, HistoryEntry[]>>({});
  const [sessions, setSessions] = useState<Record<string, SessionRecord>>({});
  const [storesReady, setStoresReady] = useState(false);

  const reload = useCallback(async () => {
    const [nextCal, nextHistory, nextSessions] = await Promise.all([
      loadCalendar(),
      loadAllHistory(),
      loadAllSessions(),
    ]);
    setCalendar(nextCal);
    setHistory(nextHistory);
    setSessions(nextSessions);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch (err) {
        console.error("[protocol/history] load failed", err);
      } finally {
        if (!cancelled) setStoresReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  function shiftMonth(delta: number) {
    const next = addMonths(year, monthIndex, delta);
    setYear(next.year);
    setMonthIndex(next.monthIndex);
    setSelectedDate(null);
  }

  if (!ready || !storesReady) {
    return <HistoryScreenSkeleton />;
  }

  return (
    <HistoryView
      calendar={calendar}
      history={history}
      sessions={sessions}
      program={program}
      today={today}
      units={prefs.units}
      year={year}
      monthIndex={monthIndex}
      selectedDate={selectedDate}
      onSelectDate={setSelectedDate}
      onPrevMonth={() => shiftMonth(-1)}
      onNextMonth={() => shiftMonth(1)}
    />
  );
}
