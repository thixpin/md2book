import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hashedName, readerScript, stylesheet } from "../../../src/web/assets.ts";
import { loadManifest } from "../../../src/fonts/manifest.ts";
import { FIXTURE_MANIFEST } from "../../helpers/fonts.ts";

const asset = (path: string) =>
  readFileSync(new URL(`../../../assets/${path}`, import.meta.url), "utf8");

describe("web assets", () => {
  it("uses common.css + web.css unchanged for my-sans (same hash as the reference)", async () => {
    const { sets } = await loadManifest(FIXTURE_MANIFEST);
    expect(stylesheet(sets["my-sans"])).toBe(`${asset("css/common.css")}\n${asset("css/web.css")}`);
  });

  it("substitutes the font families and files for another set", async () => {
    const { sets } = await loadManifest(FIXTURE_MANIFEST);
    const css = stylesheet(sets["en-serif"]);
    expect(css).not.toContain('"Noto Sans Myanmar"');
    expect(css).toContain('font-family: "Noto Serif"');
    expect(css).toContain('url("fonts/NotoSans-Regular.ttf")');
    expect(css).toContain('url("fonts/NotoSans-Bold.ttf")');
    expect(css).toContain('url("fonts/NotoSansMono-Regular.ttf")');
    expect(css).toContain('"Noto Sans Mono"');
  });

  it("names assets by the first 12 hex digits of their content hash", () => {
    expect(hashedName("style", "css", "a")).toBe("style.ca978112ca1b.css");
    expect(hashedName("reader", "js", readerScript())).toMatch(/^reader\.[0-9a-f]{12}\.js$/);
  });

  it("gives code and terminal lines more room than the shared 1.4 (last pre rule wins)", async () => {
    const { sets } = await loadManifest(FIXTURE_MANIFEST);
    const css = stylesheet(sets["my-sans"]);
    const heights = [...css.matchAll(/(?:^|\n|\})\s*pre\s*\{[^}]*line-height:\s*([\d.]+)/g)].map(
      (m) => m[1],
    );
    expect(heights.at(-1)).toBe("1.7");
  });

  it("scales text and titles by --text-scale and keeps code blocks at their size", async () => {
    const { sets } = await loadManifest(FIXTURE_MANIFEST);
    const css = stylesheet(sets["my-sans"]).replace(/\s+/g, " ");
    expect(css).toContain(".reader-flow { font-size: calc(1em * var(--text-scale, 1)); }");
    expect(css).toContain(".reader-flow pre { font-size: calc(.72em / var(--text-scale, 1)); }");
    expect(css).toContain(
      ".chapter-head h1 { font-size: calc(clamp(1.75rem, 3vw, 2.5rem) * var(--text-scale, 1)); }",
    );
    expect(css).toContain(
      ".book-name, .chapter-number { font-size: calc(.9rem * var(--text-scale, 1)); }",
    );
  });
});
