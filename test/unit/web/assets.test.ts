import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  epubStylesheets,
  hashedName,
  readerScript,
  stylesheet,
} from "../../../src/web/assets.ts";
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

  it("drops the @font-face rules of faces a set does not have (spec 006)", async () => {
    const { sets } = await loadManifest(FIXTURE_MANIFEST);
    const sans = sets["my-sans"];
    const set = {
      ...sans,
      id: "my-padauk" as const,
      body_family: "Padauk",
      faces: [
        { ...sans.faces[0]!, file: "Padauk-Regular.ttf" },
        { ...sans.faces[2]!, file: "Padauk-Bold.ttf" },
        ...sans.faces.slice(5),
      ],
    };
    const css = `${stylesheet(set)}\n${epubStylesheets(set).epub}`;
    expect(css).toContain('font-family: "Padauk"');
    expect(css).toContain("Padauk-Regular.ttf");
    expect(css).toContain("Padauk-Bold.ttf");
    expect(css).not.toContain("NotoSansMyanmar-");
    expect(css).toContain("NotoSansMono-Regular.ttf");
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
      ".chapter-head h1 { font-size: calc(clamp(1.4rem, 2.2vw, 1.75rem) * var(--text-scale, 1)); }",
    );
    expect(css).toContain(
      ".book-name, .chapter-number { font-size: calc(.9rem * var(--text-scale, 1)); }",
    );
  });

  it("gives the header title a line box tall enough for Burmese stacked glyphs", async () => {
    const { sets } = await loadManifest(FIXTURE_MANIFEST);
    const css = stylesheet(sets["my-sans"]);
    const rules = [...css.matchAll(/\.site-header a \{([^}]*)\}/g)].map((m) => m[1]);
    expect(rules.join(" ")).toContain("overflow: hidden");
    expect(rules.at(-1)).toContain("line-height: 2;");
  });

  it("keeps every section heading with its content (spec 004 FR-020)", async () => {
    const { sets } = await loadManifest(FIXTURE_MANIFEST);
    const css = stylesheet(sets["my-sans"]).replace(/\s+/g, " ");
    expect(css).toContain(
      ".chapter-body h3, .chapter-body h4, .chapter-body h5, .chapter-body h6 { break-after: avoid; }",
    );
    expect(css).toContain(
      ".keep-with-next { break-before: column; -webkit-column-break-before: always; }",
    );
  });
});
