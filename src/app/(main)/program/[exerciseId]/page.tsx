import { ProgramWorkspace } from "@/components/program/ProgramWorkspace";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Exercise" };

export default async function ExerciseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ exerciseId: string }>;
  searchParams: Promise<{ day?: string; slot?: string }>;
}) {
  const { exerciseId } = await params;
  const { day, slot } = await searchParams;
  return (
    <ProgramWorkspace
      selectedId={exerciseId}
      dayFromUrl={day}
      slotFromUrl={slot}
    />
  );
}
