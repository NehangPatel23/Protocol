"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Copy, MoreVertical, Play, Repeat2 } from "lucide-react";
import { youtubeSearchUrl } from "@/lib/program/format";

interface ExerciseOverflowMenuProps {
  exerciseName: string;
  alternative?: { id: string; name: string; href: string };
  hasAlternativeNote?: boolean;
}

export function ExerciseOverflowMenu({
  exerciseName,
  alternative,
  hasAlternativeNote,
}: ExerciseOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copyName() {
    try {
      await navigator.clipboard.writeText(exerciseName);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 900);
    } catch {
      setOpen(false);
    }
  }

  const itemClass =
    "flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-[15px] text-primary hover:bg-surface";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted hover:text-primary"
        aria-label="Exercise actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="h-5 w-5" aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-60 overflow-hidden rounded-xl border border-border-subtle bg-surface-raised py-1 shadow-lg"
        >
          <a
            role="menuitem"
            href={youtubeSearchUrl(exerciseName)}
            target="_blank"
            rel="noopener noreferrer"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <Play className="h-4 w-4 text-accent" aria-hidden />
            Watch demo
          </a>
          {alternative ? (
            <Link
              role="menuitem"
              href={alternative.href}
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <Repeat2 className="h-4 w-4 text-info" aria-hidden />
              {alternative.name}
            </Link>
          ) : hasAlternativeNote ? (
            <a
              role="menuitem"
              href="#alternatives"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <Repeat2 className="h-4 w-4 text-info" aria-hidden />
              See alternative
            </a>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => void copyName()}
          >
            <Copy className="h-4 w-4 text-muted" aria-hidden />
            {copied ? "Copied name" : "Copy name"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
