import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { daysBetween } from "./cycle";
import { mobilityArt, mobilityForMuscles, recentMusclesFromHistory } from "./mobility";
import type { MuscleGroup } from "./types";

describe("mobilityForMuscles", () => {
  const fallbackMuscles: MuscleGroup[] = ["back", "chest", "quads"];

  it("returns the generic back/chest/quads list when history is empty", () => {
    const empty = mobilityForMuscles([]);
    const generic = mobilityForMuscles(fallbackMuscles);
    expect(empty).toEqual(generic);
    expect(empty).toHaveLength(3);
  });

  it("prioritizes recent muscle groups over the generic fallback list", () => {
    const recent: MuscleGroup[] = ["hamstrings", "glutes", "calves"];
    const selected = mobilityForMuscles(recent);
    const generic = mobilityForMuscles([]);
    expect(selected).toEqual(mobilityForMuscles(recent));
    expect(selected).not.toEqual(generic);
    expect(selected[0]).toEqual(mobilityForMuscles(["hamstrings"])[0]);
    expect(selected[1]).toEqual(mobilityForMuscles(["glutes"])[0]);
    expect(selected[2]).toEqual(mobilityForMuscles(["calves"])[0]);
  });

  it("shows the dead hang as a third form position on cat-cow, not as a tip", () => {
    const drill = mobilityForMuscles(["back"], 1)[0]!;
    expect(drill.extraForm?.label).toBe("Hang");
    expect(drill.extraForm?.slot).toBe("hang");
    expect(drill.formCaptions?.start).toMatch(/tailbone/i);
    expect(drill.formCaptions?.finish).toMatch(/belly/i);
    expect(drill.tips.map((tip) => tip.text).join(" ")).not.toMatch(/hang/i);
  });

  it("gives every drill anatomical form images and at least two illustrated tips", () => {
    const muscles: MuscleGroup[] = [
      "chest",
      "shoulders",
      "triceps",
      "back",
      "biceps",
      "quads",
      "hamstrings",
      "glutes",
      "calves",
      "core",
      "forearms",
    ];
    const publicDir = path.resolve(__dirname, "../../../public");
    for (const muscle of muscles) {
      const drill = mobilityForMuscles([muscle], 1)[0]!;
      expect(drill.tips.length).toBeGreaterThanOrEqual(
        drill.formCaptions ? 0 : drill.extraForm ? 1 : 2,
      );
      if (drill.formCaptions) {
        expect(drill.formCaptions.start.length).toBeGreaterThan(0);
        expect(drill.formCaptions.finish.length).toBeGreaterThan(0);
      }
      for (const tip of drill.tips) {
        expect(tip.text.length).toBeGreaterThan(0);
      }
      const slots = ["start", "finish"] as const;
      for (const slot of slots) {
        const file = path.join(
          publicDir,
          mobilityArt(drill.id, slot).replace(/^\//, ""),
        );
        expect(existsSync(file), file).toBe(true);
      }
      if (drill.extraForm) {
        const hang = path.join(
          publicDir,
          mobilityArt(drill.id, drill.extraForm.slot).replace(/^\//, ""),
        );
        expect(existsSync(hang), hang).toBe(true);
      }
      for (const tip of drill.tips) {
        const file = path.join(
          publicDir,
          mobilityArt(drill.id, tip.image).replace(/^\//, ""),
        );
        expect(existsSync(file), file).toBe(true);
      }
    }
  });
});

describe("recentMusclesFromHistory", () => {
  const primary: Record<string, MuscleGroup[]> = {
    "seated-leg-curl": ["hamstrings"],
    "glute-machine": ["glutes"],
    "standing-calf-raise": ["calves"],
    "chest-press-machine": ["chest"],
  };

  it("returns [] when nothing is logged, matching mobilityForMuscles fallback input", () => {
    expect(
      recentMusclesFromHistory({}, (id) => primary[id], "2026-09-05"),
    ).toEqual([]);
    expect(
      mobilityForMuscles(
        recentMusclesFromHistory({}, (id) => primary[id], "2026-09-05"),
      ),
    ).toEqual(mobilityForMuscles([]));
  });

  it("orders muscles by most recent session in the 7-day window", () => {
    const history = {
      "seated-leg-curl": [{ date: "2026-09-05" }],
      "glute-machine": [{ date: "2026-09-04" }],
      "standing-calf-raise": [{ date: "2026-09-03" }],
    };
    expect(
      recentMusclesFromHistory(history, (id) => primary[id], "2026-09-05"),
    ).toEqual(["hamstrings", "glutes", "calves"]);
  });

  it("ignores sessions older than 7 days", () => {
    expect(daysBetween("2026-08-28", "2026-09-05")).toBe(8);
    const history = {
      "chest-press-machine": [{ date: "2026-08-28" }],
    };
    expect(
      recentMusclesFromHistory(history, (id) => primary[id], "2026-09-05"),
    ).toEqual([]);
  });
});
