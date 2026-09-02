import { pillsForExercise } from "@/lib/program/pills";
import type { LibraryExercise } from "@/lib/program/types";

interface ExercisePillsProps {
  exercise: LibraryExercise;
  extraText?: string[];
  size?: "md" | "sm";
  className?: string;
}

export function ExercisePills({
  exercise,
  extraText,
  size = "md",
  className,
}: ExercisePillsProps) {
  const pills = pillsForExercise(exercise, extraText);
  const compact = size === "sm";

  return (
    <ul className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      {pills.map((pill) => {
        const Icon = pill.icon;
        const tone =
          pill.tone === "accent" ? "text-accent" : "text-secondary";
        return (
          <li
            key={pill.id}
            className={`inline-flex items-center rounded-md bg-surface-raised font-mono font-medium ${tone} ${
              compact
                ? "gap-1 px-1.5 py-0.5 text-[10px]"
                : "gap-1.5 px-2 py-1 text-[11px]"
            }`}
          >
            <Icon
              className={compact ? "h-3 w-3" : "h-3.5 w-3.5"}
              aria-hidden
            />
            {pill.label}
          </li>
        );
      })}
    </ul>
  );
}
