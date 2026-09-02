import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

/** Placeholder — custom exercise / workout editor lands in a later phase. */
export default function AddProgramItemPage() {
  return (
    <div className="flex min-h-[60dvh] flex-col">
      <PageHeader
        title="Add to program"
        size="h1"
        leading={
          <Link
            href="/program"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-accent"
            aria-label="Back to Program"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
        }
      />

      <div className="flex flex-1 flex-col gap-3">
        <button
          type="button"
          disabled
          className="min-h-14 rounded-xl border border-border-subtle bg-surface px-4 text-left text-[15px] font-semibold text-primary opacity-80"
        >
          Add exercise
          <span className="mt-0.5 block text-[13px] font-medium text-muted">
            Coming soon — placeholder action
          </span>
        </button>
        <button
          type="button"
          disabled
          className="min-h-14 rounded-xl border border-border-subtle bg-surface px-4 text-left text-[15px] font-semibold text-primary opacity-80"
        >
          Add workout day
          <span className="mt-0.5 block text-[13px] font-medium text-muted">
            Coming soon — placeholder action
          </span>
        </button>
      </div>
    </div>
  );
}
