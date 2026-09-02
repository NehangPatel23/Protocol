import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  /** Compact for nested panels; default fills a card */
  className?: string;
}

/**
 * Design Spec §7 empty state: icon + message + single relevant action.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-border-subtle bg-surface px-6 py-14 text-center ${className}`}
      role="status"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border-subtle bg-base">
        <Icon className="h-7 w-7 text-accent" strokeWidth={1.75} aria-hidden />
      </div>
      <p className="text-[17px] font-semibold tracking-tight text-primary">
        {title}
      </p>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-secondary">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
