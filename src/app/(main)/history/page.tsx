import Link from "next/link";
import { Calendar, Play } from "lucide-react";
import { EmptyScreen } from "@/components/EmptyScreen";

export default function HistoryPage() {
  return (
    <EmptyScreen
      title="History"
      icon={Calendar}
      emptyTitle="No workouts logged"
      description="Start today’s session from Home — your heatmap and session log will grow here."
      action={
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
        >
          <Play className="h-4 w-4" aria-hidden />
          Start from Home
        </Link>
      }
    />
  );
}
