import Link from "next/link";
import { Play, TrendingUp } from "lucide-react";
import { EmptyScreen } from "@/components/EmptyScreen";

export default function ProgressPage() {
  return (
    <EmptyScreen
      title="Progress"
      icon={TrendingUp}
      emptyTitle="Not enough data yet"
      description="Log a few more sessions and your PR wall, volume charts, and plateau flags will show up here."
      action={
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
        >
          <Play className="h-4 w-4" aria-hidden />
          Go to today’s session
        </Link>
      }
    />
  );
}
