"use client";

import { ExternalLink } from "lucide-react";
import { youtubeEmbedUrl, youtubeSearchUrl } from "@/lib/program/format";

export function YoutubeDemo({ exerciseName }: { exerciseName: string }) {
  const embed = youtubeEmbedUrl(exerciseName);
  const search = youtubeSearchUrl(exerciseName);

  return (
    <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
      <div className="relative aspect-video bg-base">
        <iframe
          title={`${exerciseName} form demo`}
          src={embed}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <a
        href={search}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 px-3 text-[13px] font-semibold text-accent"
      >
        <ExternalLink className="h-4 w-4" aria-hidden />
        Open full YouTube search
      </a>
    </section>
  );
}
