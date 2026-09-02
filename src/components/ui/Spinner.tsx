interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const SIZE = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-9 w-9 border-[2.5px]",
} as const;

/** Accent ring spinner for inline / button loading */
export function Spinner({
  size = "md",
  className = "",
  label = "Loading",
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-accent/25 border-t-accent ${SIZE[size]} ${className}`}
    />
  );
}

export function LoadingLabel({
  children = "Loading",
  size = "md",
}: {
  children?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className="inline-flex items-center gap-2.5 text-[15px] text-secondary">
      <Spinner size={size} label={children} />
      {children}
    </span>
  );
}
