"use client";

import { Trophy } from "lucide-react";
import { EmptyDoodle } from "@/components/ui/EmptyDoodle";
import type { WeightUnit } from "@/lib/db/schema";
import {
  formatAvgRpe,
  formatVolumeDisplay,
} from "@/lib/history/sessionStats";
import {
  formatSessionDate,
  type HistorySessionItem,
} from "@/lib/history/view";
import { DAY_CHIP, DAY_LABELS } from "@/lib/program/days";
import { kgToDisplay, unitLabel } from "@/lib/program/format";
import {
  bestEst1RM,
  setScheme,
  topLoadKg,
} from "@/lib/program/loggedSets";

/** Expandable History session cards — presentational only. */
export function SessionCards({
  items,
  expandedDates,
  units,
  onToggle,
}: {
  items: HistorySessionItem[];
  expandedDates: string[];
  units: WeightUnit;
  onToggle: (date: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const expanded = expandedDates.includes(item.date);
        return (
          <li key={item.date}>
            <article
              className={`overflow-hidden rounded-xl border ${
                expanded
                  ? "border-accent bg-surface-raised"
                  : "border-border-subtle bg-surface"
              }`}
            >
              <SessionRow
                item={item}
                selected={expanded}
                onSelect={() => onToggle(item.date)}
              />
              {expanded ? <SessionDetail item={item} units={units} /> : null}
            </article>
          </li>
        );
      })}
    </ul>
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
      aria-expanded={selected}
      className={`flex min-h-14 w-full flex-col gap-1 bg-transparent px-4 py-3 text-left transition-colors ${
        selected ? "" : "hover:bg-surface-raised/60"
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

function SessionStats({
  item,
  units,
}: {
  item: HistorySessionItem;
  units: WeightUnit;
}) {
  const showDuration = item.workoutDurationLabel != null;
  const showVolume = item.totalVolumeKg != null;
  const showRpe = item.avgRpe != null;
  const showPRs = (item.prHitCount ?? 0) > 0;
  if (!showDuration && !showVolume && !showRpe && !showPRs) return null;

  return (
    <dl
      className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border-subtle px-4 py-3"
      data-testid={`session-stats-${item.date}`}
    >
      {showDuration ? (
        <div>
          <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Duration
          </dt>
          <dd
            className="mt-0.5 font-mono text-[18px] font-semibold tabular text-primary"
            data-testid={`session-duration-${item.date}`}
          >
            {item.workoutDurationLabel}
          </dd>
        </div>
      ) : null}
      {showVolume ? (
        <div>
          <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Total Volume
          </dt>
          <dd
            className="mt-0.5 font-mono text-[18px] font-semibold tabular text-primary"
            data-testid={`session-volume-${item.date}`}
          >
            {formatVolumeDisplay(item.totalVolumeKg!, units)}
          </dd>
        </div>
      ) : null}
      {showRpe ? (
        <div>
          <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Avg RPE
          </dt>
          <dd
            className="mt-0.5 font-mono text-[18px] font-semibold tabular text-primary"
            data-testid={`session-avg-rpe-${item.date}`}
          >
            {formatAvgRpe(item.avgRpe!)}
          </dd>
        </div>
      ) : null}
      {showPRs ? (
        <div>
          <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            PRs Hit
          </dt>
          <dd
            className="mt-0.5 flex items-center gap-1.5 font-mono text-[18px] font-semibold tabular text-warning"
            data-testid={`session-pr-hits-${item.date}`}
          >
            <Trophy className="h-4 w-4" strokeWidth={2} aria-hidden />
            {item.prHitCount}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

export function SessionDetail({
  item,
  units,
}: {
  item: HistorySessionItem;
  units: WeightUnit;
}) {
  const recovery = item.status === "recovery";

  return (
    <div
      className="border-t border-border-subtle"
      data-testid={`session-detail-${item.date}`}
    >
      {item.outOfSequenceBanner ? (
        <p
          className="mx-4 mt-3 rounded-lg border border-border-subtle bg-base px-3 py-2 text-[13px] text-secondary"
          data-testid="out-of-sequence-banner"
        >
          Logged out of sequence — the pending day was skipped, not missed.
        </p>
      ) : null}

      <SessionStats item={item} units={units} />

      {item.exercises.length === 0 ? (
        <div className="px-4 py-4 text-center">
          <EmptyDoodle
            name={recovery ? "rest" : "workouts"}
            className="mb-3 h-28"
          />
          <p className="text-[15px] text-secondary">
            {recovery
              ? "No lifts logged — this day was an active recovery swap."
              : "No sets logged this day."}
          </p>
        </div>
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
                const externalZero =
                  ex.loadType === "external" && load === 0;
                const topLoadLabel = externalZero
                  ? "—"
                  : load === 0
                    ? "BW"
                    : `${kgToDisplay(load, units)} ${unitLabel(units)}`;
                const estLabel =
                  externalZero || est === null
                    ? "—"
                    : kgToDisplay(est, units).toFixed(1);
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
                      {topLoadLabel}
                    </td>
                    <td className="py-2.5 pr-4 text-primary">
                      {estLabel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
