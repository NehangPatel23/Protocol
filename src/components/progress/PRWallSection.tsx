"use client";

import { Trophy } from "lucide-react";
import type { ReactNode } from "react";
import type { WeightUnit } from "@/lib/db/schema";
import {
  formatPRCaption,
  formatPRDate,
  formatPRHeadline,
  type PRWallItem,
} from "@/lib/progress/view";

/** Presentational PR Wall — no IndexedDB, no providers. */
export function PRWallSection({
  items,
  units,
  emptyFallback = null,
}: {
  items: PRWallItem[];
  units: WeightUnit;
  /** When null, empty wall renders nothing (backup preview). */
  emptyFallback?: ReactNode;
}) {
  if (items.length === 0) return <>{emptyFallback}</>;

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
