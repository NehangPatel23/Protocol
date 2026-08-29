import Link from "next/link";
import { Plus } from "lucide-react";
import { EmptyScreen } from "@/components/EmptyScreen";

export default function ProgramPage() {
  return (
    <EmptyScreen
      title="Program"
      description="Your PPL / Upper-Lower cycle and exercise library will appear here from program-data.ts in Phase 1."
      action={
        <Link
          href="/program/add"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-5 w-5" aria-hidden />
          Add exercise / workout
        </Link>
      }
    />
  );
}
