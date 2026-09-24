"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RpeTrendPoint } from "@/lib/progress/rpe";
import { formatPRDate } from "@/lib/progress/view";

if (typeof window !== "undefined" && typeof ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

export function RpeTrendChart({ points }: { points: RpeTrendPoint[] }) {
  const data = useMemo(
    () =>
      points.map((p) => ({
        date: p.date,
        label: formatPRDate(p.date),
        rpe: Math.round(p.rpe * 10) / 10,
      })),
    [points],
  );

  return (
    <div className="h-44 w-full overflow-visible" data-testid="progress-rpe-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          // Positive left margin is required: a negative value clips Y-axis ticks
          // ("10", "7") against the ResponsiveContainer's overflow:hidden.
          margin={{ top: 8, right: 12, left: 8, bottom: 4 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border-subtle)" }}
            tickLine={false}
          />
          <YAxis
            domain={[1, 10]}
            ticks={[1, 4, 7, 10]}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickMargin={4}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-surface-raised)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              fontSize: 13,
            }}
            formatter={(value) => [`${value}`, "RPE"]}
          />
          <Line
            type="monotone"
            dataKey="rpe"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--accent)" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
