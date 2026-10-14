"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Leaf, Play, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { WeekCell } from "@/components/home/WeekCell";
import { SessionCards } from "@/components/history/SessionCards";
import { usePrefs } from "@/components/PrefsProvider";
import { useProgram } from "@/components/ProgramProvider";
import { EmptyDoodle } from "@/components/ui/EmptyDoodle";
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
import { DAY_LABELS } from "@/lib/program/days";
import type { ProgramRecord } from "@/lib/program/types";
import {
  addMonths,
  buildSessionList,
  formatLoggedDay,
  formatSessionDate,
  monthGrid,
  monthTitle,
  MONTH_WEEKDAY_LABELS,
  sessionForDate,
  sessionsInMonth,
  visibleMonthCells,
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
  const cells = useMemo(
    () => visibleMonthCells(monthGrid(year, monthIndex)),
    [year, monthIndex],
  );
  const allSessions = useMemo(
    () => buildSessionList(calendar, history, sessions, program),
    [calendar, history, sessions, program],
  );
  const monthSessions = useMemo(
    () => sessionsInMonth(allSessions, year, monthIndex),
    [allSessions, year, monthIndex],
  );
  const selectedSession = sessionForDate(monthSessions, selectedDate);
  const otherSessions = selectedSession
    ? monthSessions.filter((item) => item.date !== selectedDate)
    : monthSessions;
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const selectedCal = selectedDate ? calendar[selectedDate] : undefined;
  const title = monthTitle(year, monthIndex);

  useEffect(() => {
    setExpandedDates([]);
  }, [year, monthIndex]);

  function toggleExpand(date: string) {
    setExpandedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date],
    );
  }

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
              style={{ animationDelay: `${(i / Math.max(cells.length, 1)) * 400}ms` }}
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

        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
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
        </p>
      </section>

      {selectedSession ? (
        <section aria-label="Workouts for the selected day" data-testid="selected-day-workouts">
          <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Workouts Logged For {formatLoggedDay(selectedSession.date)}
          </h2>
          <SessionCards
            items={[selectedSession]}
            expandedDates={expandedDates}
            units={units}
            onToggle={toggleExpand}
          />
        </section>
      ) : selectedDate ? (
        <EmptyDayDetail
          status={selectedCal?.status}
          dayKey={selectedCal?.dayKey}
          date={selectedDate}
        />
      ) : null}

      <section aria-label="Session log">
        <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Logged Sessions · {title}
        </h2>

        {monthSessions.length === 0 ? (
          <EmptyState
            illustration="workouts"
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
        ) : otherSessions.length === 0 ? null : (
          <SessionCards
            items={otherSessions}
            expandedDates={expandedDates}
            units={units}
            onToggle={toggleExpand}
          />
        )}
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
      <div
        className="rounded-xl border border-border-subtle bg-surface px-4 py-5 text-center text-[15px] text-secondary"
        data-testid="history-empty-day"
      >
        <EmptyDoodle name="rest" className="mb-3 h-28" />
        Rest day — nothing to log.
      </div>
    );
  }
  return (
    <div
      className="rounded-xl border border-border-subtle bg-surface px-4 py-5 text-center text-[15px] text-secondary"
      data-testid="history-empty-day"
    >
      <EmptyDoodle name="workouts" className="mb-3 h-28" />
      Nothing logged on {formatSessionDate(date)}.
    </div>
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
