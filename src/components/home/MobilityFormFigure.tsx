import Image from "next/image";
import { mobilityArt } from "@/lib/program/mobility";

export function MobilityFormFigure({
  id,
  phase,
  label,
  title,
  compact = false,
}: {
  id: string;
  phase: "start" | "finish" | "hang";
  label: string;
  title: string;
  compact?: boolean;
}) {
  const alt = compact
    ? `${title} form`
    : `${title}, ${label.toLowerCase()} position`;
  return (
    <div
      className={
        compact
          ? "form-anatomy relative h-16 w-12 shrink-0 overflow-hidden rounded-md"
          : "form-anatomy flex flex-col overflow-hidden rounded-lg"
      }
    >
      <div className={compact ? "relative h-full w-full" : "relative aspect-[3/4] w-full"}>
        <Image
          src={mobilityArt(id, phase)}
          alt={alt}
          fill
          sizes={compact ? "48px" : "(max-width: 768px) 45vw, 220px"}
          className="object-contain"
        />
      </div>
      {compact ? null : (
        <span className="px-2 py-2 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
          {label}
        </span>
      )}
    </div>
  );
}
