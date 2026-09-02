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
  if (entry.status === "missed") {
    const day = entry.dayKey ? DAY_LABELS[entry.dayKey] : undefined;
    return day ? `Missed: ${day}` : "Missed";
  }
  return undefined;
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
}: {
  date?: string;
  label: string;
  dayNum: number;
  isToday: boolean;
  entry?: CalendarEntry;
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

  let cell =
    "flex aspect-square flex-col items-center justify-center rounded-lg bg-base text-muted";
  if (done) {
    cell =
      "flex aspect-square flex-col items-center justify-center rounded-lg bg-accent text-accent-foreground";
    if (isToday) {
      cell += " ring-2 ring-accent ring-offset-2 ring-offset-base";
    }
  } else if (recovery) {
    cell =
      "flex aspect-square flex-col items-center justify-center rounded-lg bg-success-bg text-success";
    if (isToday) {
      cell += " ring-2 ring-accent ring-offset-2 ring-offset-base";
    }
  } else if (isToday) {
    cell =
      "flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-accent bg-surface text-primary";
  } else if (missed) {
    cell =
      "flex aspect-square flex-col items-center justify-center rounded-lg bg-danger-bg text-danger";
  } else if (rest) {
    cell =
      "flex aspect-square flex-col items-center justify-center rounded-lg border border-border-subtle bg-surface text-secondary";
  }

  const inner = (
    <>
      <span className="font-mono text-[10px] font-semibold">{label}</span>
      {done ? (
        <Check className="h-4 w-4" aria-hidden />
      ) : recovery ? (
        <Leaf className="h-4 w-4" aria-hidden />
      ) : missed ? (
        <X className="h-4 w-4" aria-hidden />
      ) : (
        <span className="tabular text-[13px] font-semibold">{dayNum}</span>
      )}
    </>
  );

  if (missed) {
    return (
      <div className="relative">
        <button
          type="button"
          className={`${cell} w-full`}
          data-testid="week-cell-missed"
          data-status="missed"
          data-icon={iconName}
          data-date={date}
          aria-label={a11y ?? "Missed"}
          aria-expanded={missedOpen}
          onClick={() => setMissedOpen((v) => !v)}
        >
          {inner}
        </button>
        {missedOpen && missedText ? (
          <p className="absolute left-1/2 top-full z-10 mt-1 w-max -translate-x-1/2 rounded-md bg-danger-bg px-2 py-1 text-[11px] font-semibold text-danger">
            {missedText}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cell}
      data-testid={
        done
          ? "week-cell-completed"
          : recovery
            ? "week-cell-recovery"
            : rest
              ? "week-cell-rest"
              : "week-cell-blank"
      }
      data-status={status ?? "blank"}
      data-icon={iconName}
      data-date={date}
      aria-label={a11y}
    >
      {inner}
    </div>
  );
}
