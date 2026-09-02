import { describe, expect, it } from "vitest";
import { youtubeEmbedUrl } from "./format";

describe("youtubeEmbedUrl", () => {
  // Relevance of the video YouTube actually serves is NOT testable here —
  // that depends on YouTube's live search index. These tests only cover URL
  // construction: nocookie domain + per-exercise encoded query.

  const names = [
    "Seated Chest Press",
    "Lat Pulldown",
    "Bulgarian Split Squat",
  ] as const;

  it("uses the youtube-nocookie embed domain", () => {
    for (const name of names) {
      expect(youtubeEmbedUrl(name)).toContain("https://www.youtube-nocookie.com/");
    }
  });

  it("URL-encodes each exercise's actual name in the query, not a generic hardcoded search", () => {
    const urls = names.map((name) => youtubeEmbedUrl(name));
    for (let i = 0; i < names.length; i++) {
      expect(urls[i]).toContain(encodeURIComponent(names[i]));
    }
    expect(new Set(urls).size).toBe(names.length);
    expect(urls[0]).not.toBe(urls[1]);
    expect(urls[1]).not.toBe(urls[2]);
  });
});
