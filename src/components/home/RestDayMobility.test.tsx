import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as mobility from "@/lib/program/mobility";
import { mobilityForMuscles } from "@/lib/program/mobility";
import { RestDayMobility } from "./RestDayMobility";

vi.mock("@/components/PrefsProvider", () => ({
  usePrefs: () => ({ prefs: { theme: "dark", units: "lb" } }),
}));

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

  it("opens form figures and the muscle map for the tapped drill", () => {
    render(<RestDayMobility muscles={["chest"]} />);
    const drill = mobilityForMuscles(["chest"], 1)[0]!;
    fireEvent.click(screen.getByRole("button", { name: new RegExp(drill.title) }));
    const detail = screen.getByTestId("mobility-detail");
    expect(detail.textContent).toMatch(new RegExp(drill.formLabels.start));
    expect(detail.textContent).toMatch(new RegExp(drill.formLabels.finish));
    expect(detail.textContent).toMatch(/Form tips/);
    expect(detail.textContent).toContain(drill.tips[0]!.text);
    expect(detail.textContent).toContain(drill.tips[1]!.text);
    expect(detail.textContent).toMatch(/Muscles targeted/);
    expect(
      detail.querySelector('[aria-label^="Muscle map"]'),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: `${drill.title}, ${drill.formLabels.start.toLowerCase()} position`,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: `${drill.title}: ${drill.tips[0]!.text}`,
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("mobility-detail")).toBeNull();
  });

  it("renders the dead hang as its own form figure on cat-cow", () => {
    render(<RestDayMobility muscles={["back"]} />);
    const drill = mobilityForMuscles(["back"], 1)[0]!;
    fireEvent.click(screen.getAllByTestId("mobility-suggestion")[0]!);
    expect(screen.getByText(/Form — Cat → Cow → Hang/)).toBeTruthy();
    expect(
      screen.getByRole("img", { name: `${drill.title}, hang position` }),
    ).toBeTruthy();
    expect(screen.getByText(drill.extraForm!.caption)).toBeTruthy();
    expect(screen.getByText(drill.formCaptions!.start)).toBeTruthy();
    expect(screen.getByText(drill.formCaptions!.finish)).toBeTruthy();
  });
});
