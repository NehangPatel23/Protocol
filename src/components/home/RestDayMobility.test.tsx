import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as mobility from "@/lib/program/mobility";
import { mobilityForMuscles } from "@/lib/program/mobility";
import { RestDayMobility } from "./RestDayMobility";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RestDayMobility", () => {
  it("calls mobilityForMuscles and renders that output, not placeholder copy", () => {
    const spy = vi.spyOn(mobility, "mobilityForMuscles");
    const muscles = ["hamstrings", "glutes", "calves"] as const;
    render(<RestDayMobility muscles={[...muscles]} />);

    expect(spy).toHaveBeenCalledWith([...muscles]);
    expect(
      screen.queryByText(/will show here after you’ve logged/i),
    ).toBeNull();
    for (const s of mobilityForMuscles([...muscles])) {
      expect(screen.getByText(s.title)).toBeTruthy();
      expect(screen.getByText(s.why)).toBeTruthy();
    }
    expect(screen.queryByText(mobilityForMuscles([])[0]!.title)).toBeNull();
  });

  it("empty muscles use the same fallback as mobilityForMuscles([])", () => {
    const spy = vi.spyOn(mobility, "mobilityForMuscles");
    render(<RestDayMobility muscles={[]} />);
    expect(spy).toHaveBeenCalledWith([]);
    for (const s of mobilityForMuscles([])) {
      expect(screen.getByText(s.title)).toBeTruthy();
    }
  });
});
