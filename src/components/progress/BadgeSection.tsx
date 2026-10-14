"use client";

import { Award, Flame, Trophy } from "lucide-react";
import {
  BADGE_COPY,
  type Badge,
  type BadgeId,
} from "@/lib/progress/badges";
import { formatPRDate } from "@/lib/progress/view";

const BADGE_ICONS: Record<BadgeId, typeof Trophy> = {
  "first-pr": Trophy,
  "ten-sessions": Award,
  "four-week-streak": Flame,
};

/** Presentational badges — no IndexedDB, no providers. */
export function BadgeSection({ badges }: { badges: Badge[] }) {
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
