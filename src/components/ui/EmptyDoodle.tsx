import Image from "next/image";

export type EmptyIllustration =
  | "workouts"
  | "progress"
  | "rest"
  | "search"
  | "program";

/** Anatomy-study doodle for an empty state. Decorative; the title carries the meaning. */
export function EmptyDoodle({
  name,
  className = "h-40",
}: {
  name: EmptyIllustration;
  className?: string;
}) {
  return (
    <Image
      src={`/empty/${name}.webp`}
      alt=""
      width={480}
      height={640}
      data-testid={`empty-doodle-${name}`}
      className={`mx-auto w-auto max-w-full object-contain ${className}`}
    />
  );
}
