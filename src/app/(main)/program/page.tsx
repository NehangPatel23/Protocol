import { ProgramWorkspace } from "@/components/program/ProgramWorkspace";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Program" };

export default async function ProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; slot?: string }>;
}) {
  const { day, slot } = await searchParams;
  return <ProgramWorkspace dayFromUrl={day} slotFromUrl={slot} />;
}
