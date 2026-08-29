import type { ReactNode } from "react";

interface EmptyScreenProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/** Phase 0 empty state — Design Spec §7 empty state pattern */
export function EmptyScreen({ title, description, action }: EmptyScreenProps) {
  return (
    <div className="flex min-h-[60dvh] flex-col">
      <header className="mb-6">
        <h1 className="text-[32px] font-bold leading-tight tracking-tight text-primary">
          {title}
        </h1>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-border-subtle bg-surface px-6 py-16 text-center">
        <p className="max-w-sm text-[15px] text-secondary">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}
