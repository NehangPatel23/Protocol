import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

afterEach(() => {
  cleanup();
});

describe("EmptyState", () => {
  it("shows an anatomy doodle instead of an icon tile", () => {
    render(
      <EmptyState
        illustration="workouts"
        title="No workouts this month"
        description="Blank days are just unused — not misses."
      />,
    );
    const doodle = screen.getByTestId("empty-doodle-workouts");
    expect(decodeURIComponent(doodle.getAttribute("src") ?? "")).toContain(
      "/empty/workouts.webp",
    );
    expect(doodle.getAttribute("alt")).toBe("");
    expect(screen.getByText("No workouts this month")).toBeTruthy();
  });
});
