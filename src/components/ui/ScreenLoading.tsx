import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";

/** Home dashboard shimmer while program/prefs hydrate */
export function HomeScreenSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading home">
      <PageHeader title="Home" priority />
      <Skeleton className="h-44 w-full" rounded="xl" />
      <div className="flex gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-12 flex-1" rounded="lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24" rounded="xl" />
        <Skeleton className="h-24" rounded="xl" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16" rounded="xl" />
        ))}
      </div>
    </div>
  );
}

/** Program list shimmer */
export function ProgramScreenSkeleton() {
  return (
    <div className="flex flex-col" aria-busy="true" aria-label="Loading program">
      <PageHeader title="Program" />
      <Skeleton className="mb-2 h-3 w-28" />
      <div className="mb-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-24 shrink-0" rounded="full" />
        ))}
      </div>
      <Skeleton className="mb-3 h-11 w-full" rounded="xl" />
      <Skeleton className="mb-2 h-3 w-32" />
      <div className="overflow-hidden rounded-xl border border-border-subtle">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className={`flex items-center justify-between gap-3 bg-surface px-4 py-3.5 ${
              i > 0 ? "border-t border-border-subtle" : ""
            }`}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-7 w-24" rounded="md" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Exercise detail shimmer */
export function ExerciseDetailSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="Loading exercise"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11" rounded="xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-48" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-7 w-24" rounded="full" />
        <Skeleton className="h-7 w-20" rounded="full" />
        <Skeleton className="h-7 w-28" rounded="full" />
      </div>
      <Skeleton className="h-48 w-full" rounded="xl" />
      <Skeleton className="h-12 w-full" rounded="xl" />
      <Skeleton className="h-28 w-full" rounded="xl" />
      <Skeleton className="h-28 w-full" rounded="xl" />
    </div>
  );
}

/** Generic settings / list shimmer */
export function SettingsScreenSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Loading settings"
    >
      <PageHeader title="Settings" />
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
        <div className="border-b border-border-subtle px-4 py-3">
          <Skeleton className="h-3 w-36" />
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className={`flex items-center justify-between gap-4 px-4 py-4 ${
              i > 0 ? "border-t border-border-subtle" : ""
            }`}
          >
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-9 w-24" rounded="lg" />
          </div>
        ))}
      </div>
      <Skeleton className="h-24 w-full" rounded="xl" />
    </div>
  );
}
