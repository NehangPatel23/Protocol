import type { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
  /** Rounded full for chips/avatars */
  rounded?: "md" | "lg" | "xl" | "full";
}

const ROUND = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
} as const;

/** Shimmer placeholder block — Design Spec calm loading treatment */
export function Skeleton({
  className = "",
  style,
  rounded = "lg",
}: SkeletonProps) {
  return (
    <div
      className={`protocol-skeleton ${ROUND[rounded]} ${className}`}
      style={style}
      aria-hidden
    />
  );
}

export function SkeletonText({
  lines = 2,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}
