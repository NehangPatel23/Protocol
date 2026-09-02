"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import {
  glossaryStorageKey,
  shouldAutoOpenGlossary,
  type GlossaryTerm,
} from "@/lib/program/glossary";

export type { GlossaryTerm } from "@/lib/program/glossary";
export {
  glossaryStorageKey,
  glossaryTermsFromCopy,
  shouldAutoOpenGlossary,
  termsInText,
} from "@/lib/program/glossary";

const COPY: Record<
  GlossaryTerm,
  { label: string; title: string; body: string }
> = {
  "1rm": {
    label: "1RM",
    title: "What is 1RM?",
    body: "One-rep max — the heaviest weight you could lift for a single clean rep. We estimate it with the Epley formula on sets of 12 reps or fewer.",
  },
  rpe: {
    label: "RPE",
    title: "What is RPE?",
    body: "Rate of Perceived Exertion, 1–10. 10 is an all-out set; 8 means you had about two reps left. It tracks effort, not just the load on the bar.",
  },
  rir: {
    label: "RIR",
    title: "What is RIR?",
    body: "Reps in Reserve — how many more clean reps you could have done. RIR 2 is the same idea as RPE 8.",
  },
  amrap: {
    label: "AMRAP",
    title: "What is AMRAP?",
    body: "As Many Reps As Possible — take the set to (or very near) failure rather than stopping at a fixed number.",
  },
};

export function GlossaryTooltip({
  term,
  autoOpen = true,
}: {
  term: GlossaryTerm;
  autoOpen?: boolean;
}) {
  const meta = COPY[term];
  const key = glossaryStorageKey(term);
  const [open, setOpen] = useState(false);
  const [firstVisit, setFirstVisit] = useState(false);

  useEffect(() => {
    try {
      const auto = shouldAutoOpenGlossary(term, (k) => localStorage.getItem(k));
      setFirstVisit(auto);
      if (auto && autoOpen) setOpen(true);
    } catch {
      /* ignore */
    }
  }, [term, autoOpen]);

  function dismiss() {
    setOpen(false);
    setFirstVisit(false);
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-accent"
        aria-expanded={open}
        aria-label={meta.title}
        onClick={() => (open ? dismiss() : setOpen(true))}
      >
        <Info className="h-4 w-4" />
      </button>
      {open ? (
        <span
          role="note"
          className="absolute left-0 top-10 z-20 w-64 rounded-xl border border-border-subtle bg-surface-raised p-3 text-[13px] font-normal normal-case tracking-normal text-secondary shadow-lg"
        >
          {firstVisit ? (
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
              First look
            </span>
          ) : null}
          <strong className="text-primary">{meta.label}</strong> {meta.body}
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 block text-[13px] font-semibold text-accent"
          >
            Got it
          </button>
        </span>
      ) : null}
    </span>
  );
}

export function GlossaryRow({ terms }: { terms: GlossaryTerm[] }) {
  if (terms.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-1">
      {terms.map((term) => (
        <li key={term} className="inline-flex items-center gap-0.5">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">
            {COPY[term].label}
          </span>
          <GlossaryTooltip term={term} />
        </li>
      ))}
    </ul>
  );
}
