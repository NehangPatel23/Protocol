import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/program/types";

interface MusclePillsProps {
  primary: MuscleGroup[];
  secondary?: MuscleGroup[];
  /** Extra chips after muscles, e.g. 2nd session. */
  extra?: string[];
  size?: "md" | "sm";
  className?: string;
}

export function MusclePills({
  primary,
  secondary = [],
  extra = [],
  size = "sm",
  className,
}: MusclePillsProps) {
  const seen = new Set<MuscleGroup>();
  const groups: { id: string; label: string; tone: "primary" | "secondary" }[] =
    [];

  for (const g of primary) {
    if (seen.has(g)) continue;
    seen.add(g);
    groups.push({ id: g, label: MUSCLE_LABELS[g], tone: "primary" });
  }
  for (const g of secondary) {
    if (seen.has(g)) continue;
    seen.add(g);
    groups.push({ id: g, label: MUSCLE_LABELS[g], tone: "secondary" });
  }

  if (groups.length === 0 && extra.length === 0) return null;

  const compact = size === "sm";
  const pad = compact
    ? "gap-1.5 px-1.5 py-0.5 text-[10px]"
    : "gap-1.5 px-2 py-1 text-[11px]";

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {groups.map((g) => (
        <li
          key={g.id}
          className={`inline-flex items-center rounded-md font-mono font-medium ${pad} ${
            g.tone === "primary"
              ? "bg-info-bg text-info"
              : "bg-info-bg/55 text-info/75"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              g.tone === "primary" ? "bg-info" : "bg-info/50"
            }`}
            aria-hidden
          />
          {g.label}
        </li>
      ))}
      {extra.map((label) => (
        <li
          key={label}
          className={`inline-flex items-center rounded-md bg-surface-raised font-mono font-medium text-muted ${pad}`}
        >
          {label}
        </li>
      ))}
    </ul>
  );
}
