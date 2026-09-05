"use client";

import { useState } from "react";
import { Check, Leaf, X } from "lucide-react";
import {
  addLocalDays,
  type CalendarEntry,
} from "@/lib/program/cycle";
import { DAY_LABELS } from "@/lib/program/days";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export function weekCellAccessibleLabel(
  entry: CalendarEntry | undefined,
): string | undefined {
  if (!entry) return undefined;
  if (entry.status === "completed") return "Completed";
  if (entry.status === "recovery") return "Active Recovery";
  if (entry.status === "rest") return "Rest";
  if (entry.status === "missed") {
    const day = entry.dayKey ? DAY_LABELS[entry.dayKey] : undefined;
    return day ? `Missed: ${day}` : "Missed";
  }
  return undefined;
}

export function calendarCellClassName(
  status: CalendarEntry["status"] | undefined,
  isToday: boolean,
  opts?: { selected?: boolean; compact?: boolean },
): string {
  const done = status === "completed";
  const recovery = status === "recovery";
  const missed = status === "missed";
  const rest = status === "rest";
  const compact = opts?.compact === true;
  const selected = opts?.selected === true;

  let cell =
    "flex aspect-square w-full min-w-0 flex-col items-center justify-center rounded-lg bg-base text-muted";
  if (done) {
    cell =
      "flex aspect-square w-full min-w-0 flex-col items-center justify-center rounded-lg bg-accent text-accent-foreground";
  } else if (recovery) {
    cell =
      "flex aspect-square w-full min-w-0 flex-col items-center justify-center rounded-lg bg-success-bg text-success";
  } else if (missed) {
    cell =
      "flex aspect-square w-full min-w-0 flex-col items-center justify-center rounded-lg bg-danger-bg text-danger";
  } else if (rest) {
    // Hollow outline — Design Spec §7 streak cell. Fill matches the
    // page (`bg-transparent`), so this does not read as a fourth solid state.
    cell =
      "flex aspect-square w-full min-w-0 flex-col items-center justify-center rounded-lg border-2 border-muted bg-transparent text-secondary";
  } else if (isToday) {
    cell =
      "flex aspect-square w-full min-w-0 flex-col items-center justify-center rounded-lg border-2 border-accent bg-surface text-primary";
  }

  // Month cells are too tight for ring-offset — it paints into neighboring
  // columns and looks like a shifted box. Inset ring stays inside the cell.
  const todayRing = compact
    ? " ring-2 ring-inset ring-accent"
    : " ring-2 ring-accent ring-offset-2 ring-offset-base";
  const selectedRing = compact
    ? " ring-2 ring-inset ring-accent"
    : " ring-2 ring-accent/60 ring-offset-2 ring-offset-base";

  if (isToday && (done || recovery || missed || rest)) {
    cell += todayRing;
  }
  if (selected && !isToday) {
    cell += selectedRing;
  }
  return cell;
}

export function WeekStrip({
  weekStart,
  today,
  calendar,
}: {
  weekStart: string;
  today: string;
  calendar: Record<string, CalendarEntry>;
}) {
  return (
    <ol className="grid grid-cols-7 gap-1.5">
      {WEEKDAYS.map((label, i) => {
        const date = addLocalDays(weekStart, i);
        const dayNum = Number(date.slice(8));
        return (
          <li key={date}>
            <WeekCell
              date={date}
              label={label}
              dayNum={dayNum}
              isToday={date === today}
              entry={calendar[date]}
            />
          </li>
        );
      })}
    </ol>
  );
}

export function WeekCell({
  date,
  label,
  dayNum,
  isToday,
  entry,
  layout = "week",
  selected = false,
  onSelect,
}: {
  date?: string;
  label: string;
  dayNum: number;
  isToday: boolean;
  entry?: CalendarEntry;
  /** Month cells keep the day number visible; status icon sits under it. */
  layout?: "week" | "month";
  selected?: boolean;
  onSelect?: (date: string) => void;
}) {
  const [missedOpen, setMissedOpen] = useState(false);
  const status = entry?.status;
  const done = status === "completed";
  const recovery = status === "recovery";
  const missed = status === "missed";
  const rest = status === "rest";
  const a11y = weekCellAccessibleLabel(entry);
  const iconName = done ? "check" : recovery ? "leaf" : missed ? "x" : undefined;
  const missedText =
    missed && entry?.dayKey ? `Missed: ${DAY_LABELS[entry.dayKey]}` : null;

  const cell = calendarCellClassName(status, isToday, {
    selected,
    compact: layout === "month",
  });

  const statusIcon = done ? (
    <Check className="h-4 w-4" aria-hidden />
  ) : recovery ? (
    <Leaf className="h-4 w-4" aria-hidden />
  ) : missed ? (
    <X className="h-4 w-4" aria-hidden />
  ) : null;

  const inner =
    layout === "month" ? (
      <>
        <span className="font-mono text-[10px] font-semibold">{dayNum}</span>
        {statusIcon ?? <span className="h-4 w-4" aria-hidden />}
      </>
    ) : (
      <>
        <span className="font-mono text-[10px] font-semibold">{label}</span>
        {statusIcon ?? (
          <span className="tabular text-[13px] font-semibold">{dayNum}</span>
        )}
      </>
    );

  const testId = done
    ? "week-cell-completed"
    : recovery
      ? "week-cell-recovery"
      : rest
        ? "week-cell-rest"
        : missed
          ? "week-cell-missed"
          : "week-cell-blank";

  const dataAttrs = {
    "data-testid": testId,
    "data-status": status ?? "blank",
    "data-icon": iconName,
    "data-date": date,
  } as const;

  function select() {
    if (date && onSelect) onSelect(date);
  }

  // Month heatmap: never float a label over the next row — History's
  // detail panel is the tap target for "Missed: [Day]". Home's week
  // strip still uses the popover (it's a single row).
  if (missed && layout !== "month") {
    return (
      <div className="relative w-full min-w-0">
        <button
          type="button"
          className={cell}
          {...dataAttrs}
          aria-label={a11y ?? "Missed"}
          aria-expanded={missedOpen}
          aria-pressed={selected}
          onClick={() => {
            setMissedOpen((v) => !v);
            select();
          }}
        >
          {inner}
        </button>
        {missedOpen && missedText ? (
          <p className="absolute bottom-full left-1/2 z-20 mb-1 w-max max-w-[min(12rem,70vw)] -translate-x-1/2 rounded-md bg-danger-bg px-2 py-1 text-[11px] font-semibold text-danger">
            {missedText}
          </p>
        ) : null}
      </div>
    );
  }

  if (onSelect && date) {
    return (
      <button
        type="button"
        className={cell}
        {...dataAttrs}
        aria-label={a11y ?? (missed ? "Missed" : rest ? "Rest" : `Day ${dayNum}`)}
        aria-pressed={selected}
        onClick={select}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={cell} {...dataAttrs} aria-label={a11y}>
      {inner}
    </div>
  );
}
