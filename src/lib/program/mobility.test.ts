import { describe, expect, it } from "vitest";
import { mobilityForMuscles } from "./mobility";
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
});
