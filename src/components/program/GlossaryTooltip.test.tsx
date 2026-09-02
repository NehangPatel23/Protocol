import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GlossaryRow } from "./GlossaryTooltip";
import { glossaryTermsFromCopy } from "@/lib/program/glossary";

afterEach(() => {
  cleanup();
});

describe("GlossaryRow term triggers", () => {
  it("renders an RPE trigger when a cue contains RPE", () => {
    const terms = glossaryTermsFromCopy(
      ["Work up to RPE 8 on the last set"],
      [],
    );
    const { container } = render(<GlossaryRow terms={terms} />);
    expect(terms).toContain("rpe");
    expect(
      screen.getByRole("button", { name: "What is RPE?" }),
    ).toBeTruthy();
    expect(container.querySelector('[aria-label="What is RIR?"]')).toBeNull();
    expect(container.querySelector('[aria-label="What is AMRAP?"]')).toBeNull();
  });

  it("does not render RPE/RIR/AMRAP triggers when those terms are absent", () => {
    const terms = glossaryTermsFromCopy(
      ["Keep elbows tucked and the bar over mid-foot"],
      ["Don't flare the ribs"],
    );
    const { container } = render(<GlossaryRow terms={terms} />);
    expect(terms).not.toContain("rpe");
    expect(container.querySelector('[aria-label="What is RPE?"]')).toBeNull();
    expect(container.querySelector('[aria-label="What is RIR?"]')).toBeNull();
    expect(container.querySelector('[aria-label="What is AMRAP?"]')).toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });
});
