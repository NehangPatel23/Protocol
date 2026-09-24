"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Flame, Play, Trophy, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { usePrefs } from "@/components/PrefsProvider";
import { useProgram } from "@/components/ProgramProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressScreenSkeleton } from "@/components/ui/ScreenLoading";
import { RpeTrendChart } from "@/components/progress/RpeTrendChart";
import { loadAllBadges, persistBadges } from "@/lib/db/badges";
import { loadCalendar } from "@/lib/db/cycle";
import { loadAllHistory, localDateKey, type HistoryEntry } from "@/lib/db/history";
import type { Prefs, WeightUnit } from "@/lib/db/schema";
import type { CalendarEntry } from "@/lib/program/cycle";
import type { ProgramRecord } from "@/lib/program/types";
import {
  BADGE_COPY,
  computeBadges,
  mergeBadges,
  type Badge,
  type BadgeId,
} from "@/lib/progress/badges";
import {
  compareExerciseVolume,
  compareMuscleVolume,
  formatPeriodDelta,
  hasEnoughPeriodHistory,
  periodWindows,
} from "@/lib/progress/period";
import { detectPlateaus } from "@/lib/progress/plateau";
import {
  canRenderRpeTrend,
  rpeTrendSeries,
} from "@/lib/progress/rpe";
import {
  buildPRWall,
  formatBestSet,
  formatPRCaption,
  formatPRDate,
  formatPRHeadline,
  formatSetsPerWeek,
  volumeShare,
  type PRWallItem,
} from "@/lib/progress/view";
import { weeklyVolumePerMuscle, type MuscleVolume } from "@/lib/progress/volume";

const EMPTY_COPY =
  "Not enough data yet — log a few more sessions";

const INACTIVE_PAUSE: Prefs["pauseMode"] = { active: false, until: null };

export interface ProgressViewProps {
  history: Record<string, HistoryEntry[]>;
  program: ProgramRecord;
  today: string;
  units: WeightUnit;
  calendar?: Record<string, CalendarEntry>;
  pauseMode?: Prefs["pauseMode"];
}

function GoToSession() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
    >
      <Play className="h-4 w-4" aria-hidden />
      Go to today’s session
    </Link>
  );
}

function VolumeRing({ share, label }: { share: number; label: string }) {
  const size = 44;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, share));
  const offset = c * (1 - clamped);
  const pct = Math.round(clamped * 100);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-label={`${pct} percent of this week’s busiest muscle`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="stroke-border-subtle"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="stroke-accent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-primary"
        fontSize="10"
        fontWeight="600"
      >
        {pct}
      </text>
      <title>{label}</title>
    </svg>
  );
}

function VolumeSection({ rows }: { rows: MuscleVolume[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No volume this week"
        description={`${EMPTY_COPY}. Secondary muscles count as half a set; warm-ups don’t count.`}
        action={<GoToSession />}
        className="py-10"
      />
    );
  }

  return (
    <ul data-testid="progress-volume">
      {rows.map((row) => (
        <li
          key={row.muscle}
          data-testid={`progress-volume-${row.muscle}`}
          className="flex min-h-14 items-center gap-3 border-t border-border-subtle py-3 first:border-t-0"
        >
          <VolumeRing share={volumeShare(row, rows)} label={row.label} />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {row.label}
            </p>
            <p className="tabular mt-0.5 text-[13px] text-secondary">
              {formatSetsPerWeek(row.sets)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PRWallSection({
  items,
  units,
}: {
  items: PRWallItem[];
  units: WeightUnit;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No PRs yet"
        description={`${EMPTY_COPY}. All-time bests show up here the first time you log a working set.`}
        action={<GoToSession />}
        className="py-10"
      />
    );
  }

  return (
    <div>
      {items.length === 1 ? (
        <p
          className="mb-3 text-[13px] text-muted"
          data-testid="progress-pr-sparse"
        >
          One all-time best so far — more cards appear as you beat other lifts.
        </p>
      ) : null}
      <div
        className="grid grid-cols-2 gap-3"
        data-testid="progress-pr-wall"
        data-count={items.length}
      >
        {items.map((item) => (
          <article
            key={item.exerciseId}
            data-testid={`progress-pr-card-${item.exerciseId}`}
            className="flex flex-col rounded-xl border border-border-subtle bg-surface p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <p className="min-w-0 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">
                {item.name}
              </p>
              <Trophy
                className="h-4 w-4 shrink-0 text-warning"
                strokeWidth={2}
                aria-hidden
              />
            </div>
            <p className="tabular text-[22px] font-bold leading-none tracking-tight text-accent">
              {formatPRHeadline(item, units)}
            </p>
            <p className="mt-2 text-[13px] text-muted">
              {formatPRCaption(item)}
            </p>
            <p className="sr-only">
              Achieved {formatPRDate(item.record.date)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

const BADGE_ICONS: Record<BadgeId, typeof Trophy> = {
  "first-pr": Trophy,
  "ten-sessions": Award,
  "four-week-streak": Flame,
};

function BadgeSection({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null;
  return (
    <section data-testid="progress-badges">
      <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        Badges
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {badges.map((badge) => {
          const Icon = BADGE_ICONS[badge.id];
          const copy = BADGE_COPY[badge.id];
          return (
            <li
              key={badge.id}
              data-testid={`progress-badge-${badge.id}`}
              className="rounded-xl border border-border-subtle bg-surface p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-4 w-4 text-warning" aria-hidden />
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {copy.title}
                </p>
              </div>
              <p className="text-[13px] text-secondary">{copy.description}</p>
              <p className="mt-2 text-[12px] text-muted">
                Earned {formatPRDate(badge.earnedDate)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PlateauSection({
  flags,
}: {
  flags: ReturnType<typeof detectPlateaus>;
}) {
  if (flags.length === 0) return null;
  return (
    <section data-testid="progress-plateau" className="flex flex-col gap-3">
      {flags.map((flag) => (
        <article
          key={flag.exerciseId}
          data-testid={`progress-plateau-${flag.exerciseId}`}
          className="rounded-xl border border-warning/30 bg-warning-bg px-4 py-3.5"
        >
          <h2 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-warning">
            Plateau
          </h2>
          <p className="text-[15px] font-medium text-primary">{flag.name}</p>
          <p className="mt-1 text-[13px] text-secondary">
            No weight or rep progress across the last {flag.sessionDates.length}{" "}
            sessions. A deload week or an exercise swap is the usual next step.
          </p>
        </article>
      ))}
    </section>
  );
}

function PeriodSection({
  history,
  program,
  today,
  units,
}: {
  history: Record<string, HistoryEntry[]>;
  program: ProgramRecord;
  today: string;
  units: WeightUnit;
}) {
  const enough = hasEnoughPeriodHistory(history, program, today);
  const windows = periodWindows(today);
  if (!enough) {
    return (
      <section className="rounded-xl border border-border-subtle bg-surface px-4 py-4">
        <h2 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Last 4 weeks vs previous 4
        </h2>
        <EmptyState
          icon={TrendingUp}
          title="Not enough data yet"
          description="Comparison needs working sets in both the last 4 weeks and the 4 before that — it will not compare real weeks against empty ones."
          className="py-10"
        />
        <p data-testid="progress-period-empty" className="sr-only">
          Not enough period history
        </p>
      </section>
    );
  }

  const muscles = compareMuscleVolume(history, program, today);
  const lifts = compareExerciseVolume(history, program, today);

  return (
    <section
      className="rounded-xl border border-border-subtle bg-surface px-4 py-4"
      data-testid="progress-period"
    >
      <h2 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        Last 4 weeks vs previous 4
      </h2>
      <p className="mb-4 text-[13px] text-secondary">
        {formatPRDate(windows.previous.start)}–{formatPRDate(windows.previous.end)}{" "}
        vs {formatPRDate(windows.recent.start)}–{formatPRDate(windows.recent.end)}
      </p>
      <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">
        Muscle volume
      </h3>
      <ul data-testid="progress-period-muscles" className="mb-5">
        {muscles.map((row) => (
          <li
            key={row.muscle}
            data-testid={`progress-period-muscle-${row.muscle}`}
            className="flex min-h-11 items-center justify-between gap-3 border-t border-border-subtle py-2 first:border-t-0"
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {row.label}
            </p>
            <p className="tabular text-[13px] text-secondary">
              {formatSetsPerWeek(row.previousSets).replace(" / wk", "")} →{" "}
              {formatSetsPerWeek(row.recentSets).replace(" / wk", "")}{" "}
              <span className="text-muted">
                {formatPeriodDelta(row.recentSets, row.previousSets)}
              </span>
            </p>
          </li>
        ))}
      </ul>
      <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">
        Per lift
      </h3>
      <ul data-testid="progress-period-lifts">
        {lifts.map((row) => {
          const lib = program.exercises[row.exerciseId];
          const prType = lib?.prType ?? "weight";
          const prevBest = row.previousBest
            ? formatBestSet(prType, row.previousBest, units)
            : "—";
          const nextBest = row.recentBest
            ? formatBestSet(prType, row.recentBest, units)
            : "—";
          return (
            <li
              key={row.exerciseId}
              data-testid={`progress-period-lift-${row.exerciseId}`}
              className="border-t border-border-subtle py-2 first:border-t-0"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {row.name}
                </p>
                <p className="tabular shrink-0 text-[13px] text-secondary">
                  {row.previousSets} → {row.recentSets} sets{" "}
                  <span className="text-muted">
                    {formatPeriodDelta(row.recentSets, row.previousSets)}
                  </span>
                </p>
              </div>
              <p className="mt-0.5 text-[13px] text-muted">
                Best {prevBest} → {nextBest}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RpeSection({
  history,
  program,
}: {
  history: Record<string, HistoryEntry[]>;
  program: ProgramRecord;
}) {
  const series = rpeTrendSeries(history, program);
  const defaultId =
    series.find((s) => canRenderRpeTrend(s.points))?.exerciseId ??
    series[0]?.exerciseId ??
    "";
  const [selected, setSelected] = useState(defaultId);
  useEffect(() => {
    if (series.length === 0) return;
    if (!series.some((s) => s.exerciseId === selected)) {
      setSelected(defaultId);
    }
  }, [defaultId, selected, series]);

  const current = series.find((s) => s.exerciseId === selected) ?? series[0];
  const canRender = current ? canRenderRpeTrend(current.points) : false;

  return (
    <section className="overflow-visible rounded-xl border border-border-subtle bg-surface px-4 py-4">
      <h2 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        RPE trend
      </h2>
      <p className="mb-3 text-[13px] text-secondary">
        Session-average effort, separate from the PR wall. Rising RPE at similar
        loads is fatigue, not a new max.
      </p>
      {series.length === 0 || !current || !canRender ? (
        <>
          <EmptyState
            icon={TrendingUp}
            title="Not enough data yet"
            description="Log optional RPE (1–10) on working sets across at least two sessions for a lift. Older sets never stored RPE."
            className="py-10"
          />
          <p data-testid="progress-rpe-empty" className="sr-only">
            No RPE trend
          </p>
        </>
      ) : (
        <div data-testid="progress-rpe">
          {series.length > 1 ? (
            <label className="mb-3 block">
              <span className="sr-only">Exercise</span>
              <select
                value={current.exerciseId}
                onChange={(e) => setSelected(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-border-subtle bg-base px-3 text-[14px] text-primary"
              >
                {series.map((s) => (
                  <option key={s.exerciseId} value={s.exerciseId}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {current.name}
            </p>
          )}
          <RpeTrendChart points={current.points} />
        </div>
      )}
    </section>
  );
}

export function ProgressView({
  history,
  program,
  today,
  units,
  calendar = {},
  pauseMode = INACTIVE_PAUSE,
}: ProgressViewProps) {
  const wall = useMemo(
    () => buildPRWall(history, program),
    [history, program],
  );
  const volume = useMemo(
    () => weeklyVolumePerMuscle(history, program, today),
    [history, program, today],
  );
  const badges = useMemo(
    () => computeBadges(history, calendar, program, today),
    [history, calendar, program, today],
  );
  const plateaus = useMemo(
    () => detectPlateaus(history, program, today, pauseMode),
    [history, program, today, pauseMode],
  );
  const pageEmpty =
    wall.length === 0 &&
    volume.length === 0 &&
    badges.length === 0 &&
    plateaus.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Progress" />

      {pageEmpty ? (
        <EmptyState
          icon={TrendingUp}
          title="Not enough data yet"
          description={`${EMPTY_COPY} and your PR wall, volume, and trends will show up here.`}
          action={<GoToSession />}
          className="flex-1"
        />
      ) : (
        <div className="flex flex-col gap-8">
          <BadgeSection badges={badges} />
          <PlateauSection flags={plateaus} />
          <div className="flex flex-col gap-8 md:grid md:grid-cols-2 md:items-start md:gap-6">
            <PeriodSection
              history={history}
              program={program}
              today={today}
              units={units}
            />
            <RpeSection history={history} program={program} />
            <section className="rounded-xl border border-border-subtle bg-surface px-4 py-4">
              <h2 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Volume distribution
              </h2>
              <p className="mb-3 text-[13px] text-secondary">
                Last 7 days · primary muscles full credit, secondary half
              </p>
              <VolumeSection rows={volume} />
            </section>
            <section>
              <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                PR Wall
              </h2>
              <PRWallSection items={wall} units={units} />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Reloads exerciseHistory from IndexedDB on every visit so injected or
 * just-logged sets show without a full page reload — same pattern as History.
 * Also recomputes badges against the full calendar/history and writes any
 * newly earned ids into the badges store (retroactive, not forward-only).
 */
export function ProgressScreen() {
  const { program, ready } = useProgram();
  const { prefs } = usePrefs();
  const today = localDateKey();
  const [history, setHistory] = useState<Record<string, HistoryEntry[]>>({});
  const [calendar, setCalendar] = useState<Record<string, CalendarEntry>>({});
  const [storesReady, setStoresReady] = useState(false);

  const reload = useCallback(async () => {
    const [nextHistory, nextCalendar, storedMap] = await Promise.all([
      loadAllHistory(),
      loadCalendar(),
      loadAllBadges(),
    ]);
    setHistory(nextHistory);
    setCalendar(nextCalendar);
    const stored = Object.values(storedMap);
    const merged = mergeBadges(
      computeBadges(nextHistory, nextCalendar, program, today),
      stored,
    );
    const dirty = merged.filter((badge) => {
      const prev = storedMap[badge.id];
      return !prev || prev.earnedDate !== badge.earnedDate;
    });
    if (dirty.length > 0) {
      try {
        await persistBadges(dirty);
      } catch (err) {
        console.error("[protocol/progress] badge persist failed", err);
      }
    }
  }, [program, today]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch (err) {
        console.error("[protocol/progress] load failed", err);
      } finally {
        if (!cancelled) setStoresReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  if (!ready || !storesReady) {
    return <ProgressScreenSkeleton />;
  }

  return (
    <ProgressView
      history={history}
      program={program}
      today={today}
      units={prefs.units}
      calendar={calendar}
      pauseMode={prefs.pauseMode}
    />
  );
}
