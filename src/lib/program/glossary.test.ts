import { describe, expect, it } from "vitest";
import {
  glossaryStorageKey,
  glossaryTermsFromCopy,
  shouldAutoOpenGlossary,
} from "./glossary";

describe("shouldAutoOpenGlossary", () => {
  it("is true when no stored flag exists", () => {
    const store = new Map<string, string>();
    expect(
      shouldAutoOpenGlossary("rpe", (k) => store.get(k) ?? null),
    ).toBe(true);
    expect(
      shouldAutoOpenGlossary("1rm", (k) => store.get(k) ?? null),
    ).toBe(true);
  });

  it("is false once the seen flag is stored", () => {
    const store = new Map<string, string>([
      [glossaryStorageKey("rpe"), "1"],
    ]);
    expect(
      shouldAutoOpenGlossary("rpe", (k) => store.get(k) ?? null),
    ).toBe(false);
    expect(
      shouldAutoOpenGlossary("rir", (k) => store.get(k) ?? null),
    ).toBe(true);
  });
});

describe("glossaryTermsFromCopy", () => {
  it("detects RPE/RIR/AMRAP only when those exact terms appear in cues/mistakes/notes", () => {
    const withRpe = glossaryTermsFromCopy(
      ["Last set at RPE 8, stop with two in the tank"],
      ["Don't bounce the bar"],
    );
    const without = glossaryTermsFromCopy(
      ["Keep the bar close to the body"],
      ["Don't bounce the bar"],
      ["Felt strong today"],
    );
    expect(withRpe).toContain("rpe");
    expect(without).not.toContain("rpe");
    expect(without).not.toContain("rir");
    expect(without).not.toContain("amrap");
  });
});
