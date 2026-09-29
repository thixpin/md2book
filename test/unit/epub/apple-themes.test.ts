import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../../assets/css/epub.css", import.meta.url), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Declarations of the rule whose selector list contains `selector` (last match wins). */
function rule(selector: string): string {
  const blocks = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(([, selectors]) =>
    selectors!.split(",").some((s) => s.trim() === selector),
  );
  return blocks.map(([, , body]) => body).join(";");
}

// Apple Books dark themes replace background and text colours but keep borders (spec 003 FR-008),
// so the EPUB draws the terminal window with borders.
describe("terminal window survives reader themes", () => {
  it("outlines the window and separates the title bar with borders", () => {
    expect(rule(".terminal")).toMatch(/border: 1px solid #3a3a3c/);
    expect(rule(".terminal-bar")).toMatch(/border-bottom: 1px solid #3a3a3c/);
  });

  it("draws the three dots with coloured borders instead of backgrounds", () => {
    expect(rule(".terminal-dot")).toMatch(/border: 0\.325em solid #ff5f57/);
    expect(rule(".terminal-dot")).toMatch(/width: 0/);
    expect(rule(".terminal-dot")).toMatch(/height: 0/);
    expect(rule(".terminal-dot + .terminal-dot")).toMatch(/border-color: #febc2e/);
    expect(rule(".terminal-dot + .terminal-dot + .terminal-dot")).toMatch(/border-color: #28c840/);
  });

  it("paints no background on inline elements inside the terminal (it clipped descenders)", () => {
    expect(css).not.toMatch(/\.terminal (code|span)[^{]*\{[^}]*background/);
    expect(css).not.toContain("__ibooks_internal_theme");
  });
});
