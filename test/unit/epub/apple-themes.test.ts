import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../../assets/css/epub.css", import.meta.url), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);
const THEME = ":root[__ibooks_internal_theme]";

/** Declarations of the rule whose selector list contains `selector`. */
function rule(selector: string): string {
  const blocks = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)];
  const block = blocks.find(([, selectors]) =>
    selectors!.split(",").some((s) => s.trim() === selector),
  );
  return block?.[2] ?? "";
}

describe("Apple Books theme styles for the terminal", () => {
  it.each([
    [`${THEME} .terminal`, "background-color: #1e1e1e !important"],
    [`${THEME} .terminal pre`, "background-color: #1e1e1e !important"],
    [`${THEME} .terminal pre`, "color: #f0f0f0 !important"],
    [`${THEME} .terminal-bar`, "background-color: #3a3a3c !important"],
    [`${THEME} .terminal-dot`, "background-color: #ff5f57 !important"],
    [`${THEME} .terminal-dot + .terminal-dot`, "background-color: #febc2e !important"],
    [
      `${THEME} .terminal-dot + .terminal-dot + .terminal-dot`,
      "background-color: #28c840 !important",
    ],
    [`${THEME} .terminal .gp`, "color: #4ec98f !important"],
    [`${THEME} .terminal .go`, "color: #a8b0bc !important"],
    [`${THEME} .terminal .nv`, "color: #9cdcfe !important"],
  ])("%s keeps %s", (selector, declaration) => {
    expect(rule(selector)).toContain(declaration);
  });

  it("never paints a background on terminal spans (the dots are spans)", () => {
    expect(rule(`${THEME} .terminal span`)).toContain("color: #f0f0f0 !important");
    expect(rule(`${THEME} .terminal span`)).not.toContain("background");
  });

  it("uses the same colours as the terminal design in common.css", () => {
    const common = readFileSync(new URL("../../../assets/css/common.css", import.meta.url), "utf8");
    for (const colour of [
      "#1e1e1e",
      "#3a3a3c",
      "#ff5f57",
      "#febc2e",
      "#28c840",
      "#f0f0f0",
      "#4ec98f",
      "#a8b0bc",
    ]) {
      expect(common).toContain(colour);
    }
  });
});
