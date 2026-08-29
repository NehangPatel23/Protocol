import { TabShell } from "@/components/shell/TabShell";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TabShell>{children}</TabShell>;
}
