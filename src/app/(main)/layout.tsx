import { TabShell } from "@/components/shell/TabShell";
import { ProgramProvider } from "@/components/ProgramProvider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProgramProvider>
      <TabShell>{children}</TabShell>
    </ProgramProvider>
  );
}
