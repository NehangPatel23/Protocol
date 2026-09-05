import { ActiveSession } from "@/components/session/ActiveSession";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Session" };

export default function SessionPage() {
  return <ActiveSession />;
}
