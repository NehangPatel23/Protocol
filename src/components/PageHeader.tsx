import Image from "next/image";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  /** Smaller title for drill-down screens */
  size?: "display" | "h1";
  leading?: ReactNode;
  trailing?: ReactNode;
  priority?: boolean;
}

/** Shared Protocol brand header — P glyph on every screen. */
export function PageHeader({
  title,
  size = "display",
  leading,
  trailing,
  priority = false,
}: PageHeaderProps) {
  const titleClass =
    size === "display"
      ? "text-[32px] font-bold leading-none tracking-tight text-primary"
      : "text-[24px] font-bold leading-none tracking-tight text-primary";

  return (
    <header className="mb-6 flex items-center gap-3">
      {leading}
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[12px] ring-1 ring-border-subtle">
        <Image
          src="/icons/icon-p-192.png"
          alt="Protocol"
          width={44}
          height={44}
          className="h-full w-full object-cover"
          priority={priority}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          Protocol
        </p>
        <h1 className={titleClass}>{title}</h1>
      </div>
      {trailing}
    </header>
  );
}
