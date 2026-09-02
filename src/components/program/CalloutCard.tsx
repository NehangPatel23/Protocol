import type { ReactNode } from "react";
import { CheckCircle2, Repeat2, XCircle } from "lucide-react";

type CalloutKind = "cues" | "mistakes" | "alternatives";

const STYLES: Record<
  CalloutKind,
  { wrap: string; title: string; icon: ReactNode }
> = {
  cues: {
    wrap: "border-success/25 bg-success-bg",
    title: "text-success",
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
  },
  mistakes: {
    wrap: "border-danger/30 bg-danger-bg",
    title: "text-danger",
    icon: <XCircle className="h-4 w-4" aria-hidden />,
  },
  alternatives: {
    wrap: "border-border-subtle bg-surface",
    title: "text-secondary",
    icon: <Repeat2 className="h-4 w-4" aria-hidden />,
  },
};

const TITLES: Record<CalloutKind, string> = {
  cues: "Form Cues",
  mistakes: "Common Mistakes",
  alternatives: "Alternatives",
};

interface CalloutCardProps {
  kind: CalloutKind;
  children: ReactNode;
  id?: string;
}

export function CalloutCard({ kind, children, id }: CalloutCardProps) {
  const style = STYLES[kind];
  return (
    <section id={id} className={`rounded-xl border px-4 py-3.5 ${style.wrap}`}>
      <h2
        className={`mb-2 flex items-center gap-2 text-[13px] font-semibold ${style.title}`}
      >
        {style.icon}
        {TITLES[kind]}
      </h2>
      {children}
    </section>
  );
}
