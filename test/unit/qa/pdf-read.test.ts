import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalisePdf } from "../../../src/pdf/normalise.ts";
import { pagedBundle } from "../../../src/pdf/paged.ts";
import { renderPdf } from "../../../src/pdf/render.ts";
import { pdfFacts } from "../../../src/qa/pdf-read.ts";
import { PRINT_FONTS } from "../../helpers/fonts.ts";
import { tempDir } from "../../helpers/temp.ts";

// Burmese clusters whose glyphs do not map one-to-one to characters (hex ActualText), and a Latin
// "ff" ligature (Chromium writes it as a literal-string ActualText).
const LINES = ["ကျွန်တော် ဘယ်လောက်ပေးရမလဲ။", "ဈေးနှုန်း သင်္ချိုင်း မန္တလေး", "different office"];

async function builtPdf(): Promise<string> {
  const font = (file: string) => readFileSync(join(PRINT_FONTS, file));
  const css =
    '@font-face { font-family: "Body"; src: url("/fonts/body.ttf"); }\n' +
    '@page { size: 170mm 240mm; margin: 20mm; }\nbody { font-family: "Body"; font-size: 12pt; }\n' +
    ".break { break-before: page; }\n";
  const html =
    '<!DOCTYPE html><html lang="my"><head><script>window.PagedConfig = { auto: false };</script>' +
    '<script src="/pagedjs/paged.polyfill.js"></script><link rel="stylesheet" href="/css/t.css"></head>' +
    `<body>${LINES.map((line) => `<p>${line}</p>`).join("")}<p class="break">Second page</p></body></html>`;
  const bytes = await renderPdf({
    html,
    files: {
      "/pagedjs/paged.polyfill.js": { body: pagedBundle(), type: "text/javascript" },
      "/css/t.css": { body: css, type: "text/css" },
      "/fonts/body.ttf": { body: font("NotoSansMyanmar-Regular.ttf"), type: "font/ttf" },
    },
  });
  const file = join(tempDir(), "t.pdf");
  writeFileSync(file, await normalisePdf(bytes));
  return file;
}

describe("pdfFacts", { timeout: 60_000 }, () => {
  it("reads pages, size, fonts and logical-order lines from a Chromium PDF", async () => {
    const facts = await pdfFacts(await builtPdf());
    expect(facts.pages).toBe(2);
    expect(facts.sizeMm).toEqual([170, 240]);
    expect(facts.fonts).toHaveLength(1);
    expect(facts.fonts[0]).toMatch(/^[A-Z]{6}\+NotoSansMyanmar-Regular$/);
    expect(facts.lines[0]).toEqual(LINES);
    expect(facts.lines[1]).toEqual(["Second page"]);
    for (const bad of [0x0000, 0xfffd]) expect(facts.text).not.toContain(String.fromCharCode(bad));
  });
});
