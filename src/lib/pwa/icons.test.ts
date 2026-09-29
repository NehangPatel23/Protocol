import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = path.resolve(__dirname, "../../../public");

function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

describe("PWA icon files match declared sizes", () => {
  it("apple-touch-icon is actually 180×180", () => {
    const file = path.join(publicDir, "apple-touch-icon.png");
    expect(existsSync(file)).toBe(true);
    expect(pngSize(file)).toEqual({ width: 180, height: 180 });
  });

  it("favicons are 16×16 and 32×32", () => {
    expect(pngSize(path.join(publicDir, "favicon-16x16.png"))).toEqual({
      width: 16,
      height: 16,
    });
    expect(pngSize(path.join(publicDir, "favicon-32x32.png"))).toEqual({
      width: 32,
      height: 32,
    });
  });

  it("does not keep the old root duplicates of the 192/512 marks", () => {
    expect(existsSync(path.join(publicDir, "icon-192.png"))).toBe(false);
    expect(existsSync(path.join(publicDir, "icon-512.png"))).toBe(false);
  });
});

describe("manifest.json", () => {
  const manifest = JSON.parse(
    readFileSync(path.join(publicDir, "manifest.json"), "utf8"),
  ) as {
    name: string;
    short_name: string;
    display: string;
    theme_color: string;
    background_color: string;
    start_url: string;
    icons: { src: string; sizes: string; type: string; purpose: string }[];
  };

  it("has the Protocol name, standalone display, and dark palette colors", () => {
    expect(manifest.name).toBe("Protocol");
    expect(manifest.short_name).toBe("Protocol");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#0B1120");
    expect(manifest.background_color).toBe("#0B1120");
    expect(manifest.start_url).toBe("/");
  });

  it("points every icon at a file whose real pixel size matches sizes", () => {
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);
    for (const icon of manifest.icons) {
      const [w, h] = icon.sizes.split("x").map(Number);
      const file = path.join(publicDir, icon.src.replace(/^\//, ""));
      expect(existsSync(file), `${icon.src} missing`).toBe(true);
      expect(pngSize(file)).toEqual({ width: w, height: h });
      expect(icon.type).toBe("image/png");
    }
    const purposes = manifest.icons.map((i) => i.purpose).sort();
    expect(purposes).toContain("any");
    expect(purposes).toContain("maskable");
  });
});
