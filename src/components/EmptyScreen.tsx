import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

interface EmptyScreenProps {
  title: string;
  icon: LucideIcon;
  emptyTitle: string;
  description: string;
  action?: ReactNode;
}

/** Full-page empty / coming-soon shell with brand header */
export function EmptyScreen({
  title,
  icon,
  emptyTitle,
  description,
  action,
}: EmptyScreenProps) {
  return (
    <div className="flex min-h-[60dvh] flex-col">
      <PageHeader title={title} />
      <EmptyState
        icon={icon}
        title={emptyTitle}
        description={description}
        action={action}
        className="flex-1"
      />
    </div>
  );
}
