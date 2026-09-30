// Spec 006 US2: font size presets scale every absolute size in the PDF (research R-02).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BookConfig } from "../../../src/config/load.ts";
import { FONT_SIZES, type FontSizeId } from "../../../src/config/presets.ts";
import { loadManifest } from "../../../src/fonts/manifest.ts";
import { fitPreBlocks } from "../../../src/pdf/document.ts";
import { printStylesheets, scaleFontSizes } from "../../../src/pdf/stylesheets.ts";
import { bookMm } from "../../helpers/fixture-config.ts";
import { FIXTURE_MANIFEST } from "../../helpers/fonts.ts";

const asset = (path: string) =>
  readFileSync(new URL(`../../../assets/${path}`, import.meta.url), "utf8");

async function bookCss(size: FontSizeId, printed = false): Promise<string> {
  const config: BookConfig = await bookMm();
  config.font = { ...config.font, size: { id: size, ...FONT_SIZES[size] } };
  const { sets } = await loadManifest(FIXTURE_MANIFEST);
  return printStylesheets(sets["my-sans"], config, printed).at(-1)!.css;
}

/** `font-size: <n>pt` declarations with their selector path, in file order. */
function ptSizes(css: string): number[] {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/font-size:\s*([\d.]+)pt/g)].map((m) =>
    Number(m[1]),
  );
}

describe("font size presets", () => {
  it("adds nothing for m: the typography is today's", async () => {
    const m = await bookCss("m");
    expect(m).not.toContain("html { font-size");
    expect(m).toContain("font-size: 9pt; color: #777;");
  });

  it("re-declares every carried pt size, including @page margin boxes, scaled by the factor", () => {
    for (const file of ["common.css", "print.css", "printed.css"]) {
      const css = asset(`css/${file}`);
      const scaled = scaleFontSizes(css, 1.1);
      expect(ptSizes(scaled), file).toEqual(
        ptSizes(css).map((pt) => Number((pt * 1.1).toFixed(3))),
      );
    }
    const print = scaleFontSizes(asset("css/print.css"), 1.1);
    expect(print).toContain("html { font-size: 12.1pt; }");
    expect(print).toContain("@page :left { @top-left { font-size: 9.35pt; } }");
    expect(print).toContain(".chapter-head h1 { font-size: 19.8pt; }");
    expect(print).toContain(".title-page .book-title { font-size: 28.6pt; }");
  });

  it("scales book.css's own header and folio size and includes the carried overrides", async () => {
    const l = await bookCss("l");
    expect(l).toContain("font-size: 9.9pt; color: #777;");
    expect(l).toContain("html { font-size: 12.1pt; }");
    expect(await bookCss("xs")).toContain("html { font-size: 9.35pt; }");
  });

  it("scales the code block size range", () => {
    const short = '<pre class="code"><code>x = 1</code></pre>';
    expect(fitPreBlocks(short, { textWidth: 128, factor: 1.2 })).toContain("font-size: 9.96pt");
    const long = `<pre><code>${"x".repeat(400)}</code></pre>`;
    expect(fitPreBlocks(long, { textWidth: 128, factor: 0.85 })).toContain("font-size: 5.10pt");
  });
});
