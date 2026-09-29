import { describe, expect, it } from "vitest";
import { fillMissingFormTips } from "@/lib/db/program";
import { buildProgramFromSeed } from "./seed";

describe("buildProgramFromSeed form tips", () => {
  it("gives every library exercise at least one form cue", () => {
    const program = buildProgramFromSeed();
    const missing = Object.values(program.exercises)
      .filter((exercise) => exercise.cues.length === 0)
      .map((exercise) => exercise.id);
    expect(missing).toEqual([]);
    expect(program.exercises["ab-curls-pull"]?.cues.length).toBeGreaterThan(0);
    expect(program.exercises["leg-raises-upper"]?.cues[0]).toMatch(/low back/i);
  });

  it("fills cues only for stored exercises that have none", () => {
    const program = buildProgramFromSeed();
    program.exercises["ab-curls-pull"] = {
      ...program.exercises["ab-curls-pull"]!,
      cues: [],
      mistakes: [],
    };
    program.exercises["push-ups"] = {
      ...program.exercises["push-ups"]!,
      cues: ["Keep the custom cue."],
    };
    const filled = fillMissingFormTips(program);
    expect(filled?.exercises["ab-curls-pull"]?.cues.length).toBeGreaterThan(0);
    expect(filled?.exercises["push-ups"]?.cues).toEqual(["Keep the custom cue."]);
    expect(fillMissingFormTips(filled!)).toBeNull();
  });
});
