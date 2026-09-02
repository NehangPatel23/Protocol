import { describe, expect, it } from "vitest";
import { poseForExercise } from "./formPoses";
import { formArtKey } from "./formArt";

describe("poseForExercise", () => {
  it("does not reuse a pull-up pose for back extension", () => {
    const hyper = poseForExercise("thigh-supported-back-extension", null, ["back"]);
    const pullup = poseForExercise("weighted-assisted-pullups", "pullup", ["back"]);
    expect(hyper.gear).toBe("hyperextension");
    expect(pullup.gear).toBe("pullup-bar");
    expect(hyper.labels.start).toBe("Fold");
    expect(pullup.labels.start).toBe("Hang");
  });
});

describe("formArtKey", () => {
  it("gives calf raise its own plate, not a standing map", () => {
    expect(formArtKey("calf-raise-machine", null)).toBe("calf-raise");
    expect(formArtKey("thigh-supported-back-extension", null)).toBe("back-extension");
    expect(formArtKey("weighted-assisted-pullups", "pullup")).toBe("pull-up");
  });
});
