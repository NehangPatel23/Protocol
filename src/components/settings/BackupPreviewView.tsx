"use client";

/**
 * Read-only backup preview. Presentational only — never mounts the IDB-backed
 * History / Progress screen wrappers, never reads/writes IndexedDB or localStorage.
 *
 * Overlay layout: portaled full-screen flex column. Banner is in normal document
 * flow (not sticky/fixed/absolute) and is the only place that applies
 * safe-area-inset-top. The content region is the sole scroll container.
 * Does not reuse PageHeader, HistoryScreen, ProgressScreen, or TabShell.
 */

import { Check, ChevronLeft, ChevronRight, Leaf, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { WeekCell } from "@/components/home/WeekCell";
import { SessionCards } from "@/components/history/SessionCards";
import { BadgeSection } from "@/components/progress/BadgeSection";
import { PRWallSection } from "@/components/progress/PRWallSection";
import type { BackupFileV1 } from "@/lib/backup";
import {
  resolvePreviewProgram,
  resolvePreviewUnits,
} from "@/lib/backup/viewModel";
import { localDateKey } from "@/lib/db/history";
import type { WeightUnit } from "@/lib/db/schema";
import {
  addMonths,
  buildSessionList,
  monthGrid,
  monthTitle,
  MONTH_WEEKDAY_LABELS,
  sessionsInMonth,
  visibleMonthCells,
} from "@/lib/history/view";
import { computeBadges } from "@/lib/progress/badges";
import { buildPRWall } from "@/lib/progress/view";

export interface BackupPreviewViewProps {
  backup: BackupFileV1;
  /** Device units used only when the file omits prefs.units. */
  fallbackUnits: WeightUnit;
  onClose: () => void;
  /** Override "today" for tests / month anchoring. */
  today?: string;
}

export function BackupPreviewView({
  backup,
  fallbackUnits,
  onClose,
  today: todayProp,
}: BackupPreviewViewProps) {
  const today = todayProp ?? localDateKey();
  const program = useMemo(() => resolvePreviewProgram(backup), [backup]);
  const units = useMemo(
    () => resolvePreviewUnits(backup, fallbackUnits),
    [backup, fallbackUnits],
  );
  const { calendar, exerciseHistory, sessions } = backup.data;

  const sessionList = useMemo(
    () => buildSessionList(calendar, exerciseHistory, sessions, program),
    [calendar, exerciseHistory, sessions, program],
  );
  const wall = useMemo(
    () => buildPRWall(exerciseHistory, program),
    [exerciseHistory, program],
  );
  const badges = useMemo(
    () => computeBadges(exerciseHistory, calendar, program, today),
    [exerciseHistory, calendar, program, today],
  );

  const initialMonth = useMemo(() => {
    const anchor =
      sessionList[0]?.date ??
      Object.keys(calendar).sort().at(-1) ??
      today;
    const [y, m] = anchor.split("-").map(Number);
    return { year: y, monthIndex: (m ?? 1) - 1 };
  }, [sessionList, calendar, today]);

  const [year, setYear] = useState(initialMonth.year);
  const [monthIndex, setMonthIndex] = useState(initialMonth.monthIndex);
  const [expandedDates, setExpandedDates] = useState<string[]>([]);

  useEffect(() => {
    setYear(initialMonth.year);
    setMonthIndex(initialMonth.monthIndex);
    setExpandedDates([]);
  }, [initialMonth.year, initialMonth.monthIndex, backup.exportedAt]);

  // Lock the page behind the overlay; restore on close/unmount.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const cells = useMemo(
    () => visibleMonthCells(monthGrid(year, monthIndex)),
    [year, monthIndex],
  );
  const monthSessions = useMemo(
    () => sessionsInMonth(sessionList, year, monthIndex),
    [sessionList, year, monthIndex],
  );
  const title = monthTitle(year, monthIndex);

  function shiftMonth(delta: number) {
    const next = addMonths(year, monthIndex, delta);
    setYear(next.year);
    setMonthIndex(next.monthIndex);
    setExpandedDates([]);
  }

  function toggleExpand(date: string) {
    setExpandedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date],
    );
  }

  const overlay = (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-base"
      data-testid="backup-preview"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-preview-banner"
    >
      {/* Banner: normal flow only — sole top safe-area owner inside the overlay. */}
      <div
        className="flex shrink-0 items-center justify-between gap-3 border-b border-warning/40 bg-warning-bg px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]"
        data-testid="backup-preview-banner-bar"
      >
        <p
          id="backup-preview-banner"
          className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-warning"
          data-testid="backup-preview-banner"
        >
          Previewing a backup file. Nothing is saved.
        </p>
        <button
          type="button"
          data-testid="backup-preview-close"
          onClick={onClose}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl px-3 text-[15px] font-semibold text-primary"
        >
          Close
        </button>
      </div>

      {/* Sole scroll container — no top padding / PageHeader spacer / TabShell inset. */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        data-testid="backup-preview-content"
      >
        <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
          <section aria-label="Backup calendar">
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border-subtle bg-surface text-secondary hover:text-primary"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <h2 className="text-[18px] font-semibold text-primary">{title}</h2>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border-subtle bg-surface text-secondary hover:text-primary"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
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
            <ol className="grid grid-cols-7 gap-1.5" data-testid="backup-preview-heatmap">
              {cells.map((cell, i) => (
                <li key={cell.date ?? `pad-${i}`} className="min-w-0">
                  {cell.date && cell.dayNum != null ? (
                    <WeekCell
                      date={cell.date}
                      label={cell.weekdayLabel}
                      dayNum={cell.dayNum}
                      isToday={cell.date === today}
                      entry={calendar[cell.date]}
                      layout="month"
                    />
                  ) : (
                    <div
                      className="aspect-square rounded-lg"
                      data-testid="week-cell-pad"
                      aria-hidden
                    />
                  )}
                </li>
              ))}
            </ol>

            <p
              className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"
              data-testid="backup-preview-legend"
            >
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

          <section aria-label="Backup sessions" data-testid="backup-preview-sessions">
            <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Sessions · {title}
            </h2>
            {monthSessions.length === 0 ? (
              <p className="rounded-xl border border-border-subtle bg-surface px-4 py-5 text-[15px] text-secondary">
                No completed or recovery sessions in this month of the backup.
              </p>
            ) : (
              <SessionCards
                items={monthSessions}
                expandedDates={expandedDates}
                units={units}
                onToggle={toggleExpand}
              />
            )}
          </section>

          <section aria-label="Backup PR wall" data-testid="backup-preview-pr-wall">
            <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              PR Wall
            </h2>
            <PRWallSection
              items={wall}
              units={units}
              emptyFallback={
                <p className="rounded-xl border border-border-subtle bg-surface px-4 py-5 text-[15px] text-secondary">
                  No PRs in this backup.
                </p>
              }
            />
          </section>

          <section aria-label="Backup badges" data-testid="backup-preview-badges-wrap">
            <BadgeSection badges={badges} />
            {badges.length === 0 ? (
              <p className="rounded-xl border border-border-subtle bg-surface px-4 py-5 text-[15px] text-secondary">
                No badges earned from this backup’s history.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );

  // Portal escapes DataBackupSection's overflow-hidden so fixed inset-0 is viewport-true.
  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
