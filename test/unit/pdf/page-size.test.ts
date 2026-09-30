// Spec 006 US1: page size presets in the PDF (research R-01).
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { BookConfig } from "../../../src/config/load.ts";
import { PAGE_SIZES, pageLayout, type PageSizeId } from "../../../src/config/presets.ts";
import { loadManifest } from "../../../src/fonts/manifest.ts";
import { pdfName } from "../../../src/pdf/build.ts";
import { fitPreBlocks } from "../../../src/pdf/document.ts";
import { normalisePdf } from "../../../src/pdf/normalise.ts";
import { printStylesheets } from "../../../src/pdf/stylesheets.ts";
import { bookMm } from "../../helpers/fixture-config.ts";
import { FIXTURE_MANIFEST } from "../../helpers/fonts.ts";

const withPage = (config: BookConfig, id: PageSizeId): BookConfig => ({
  ...config,
  page: { id, ...PAGE_SIZES[id] },
});

async function bookCss(id: PageSizeId): Promise<string> {
  const { sets } = await loadManifest(FIXTURE_MANIFEST);
  return printStylesheets(sets["my-sans"], withPage(await bookMm(), id), false).at(-1)!.css;
}

describe("page size presets", () => {
  it("names the PDF after the page size; default keeps -170x240", () => {
    expect(pdfName("book", false)).toBe("book-170x240.pdf");
    expect(pdfName("book", true, "148x210")).toBe("book-148x210-printed.pdf");
    expect(Object.values(PAGE_SIZES).map((p) => pdfName("b", false, p.suffix))).toEqual([
      "b-170x240.pdf",
      "b-148x210.pdf",
      "b-176x250.pdf",
      "b-210x297.pdf",
      "b-216x279.pdf",
    ]);
  });

  it("scales margins with the page and keeps a 128 : 170 text block", () => {
    expect(pageLayout(PAGE_SIZES.default)).toEqual({
      top: 20,
      bottom: 22,
      inside: 24,
      outside: 18,
      textWidth: 128,
      sy: 1,
    });
    const a4 = pageLayout(PAGE_SIZES.a4);
    expect(a4.inside).toBeCloseTo((24 * 210) / 170, 6);
    expect(a4.top).toBeCloseTo((20 * 297) / 240, 6);
    expect(a4.textWidth).toBeCloseTo((128 * 210) / 170, 6);
  });

  it("adds no page rules for the default size", async () => {
    const css = await bookCss("default");
    expect(css).not.toContain("@page { size:");
    expect(css).not.toContain(".cover-page");
  });

  it("sets the A5 page, margins, cover and scaled vertical offsets", async () => {
    const css = await bookCss("a5");
    const sy = 210 / 240;
    const mm = (v: number) => `${Number(v.toFixed(3))}mm`;
    expect(css).toContain(
      `@page { size: 148mm 210mm; margin: ${mm(20 * sy)} ${mm((18 * 148) / 170)} ${mm(22 * sy)} ${mm((18 * 148) / 170)}; }`,
    );
    expect(css).toContain(
      `@page :left { margin-left: ${mm((18 * 148) / 170)}; margin-right: ${mm((24 * 148) / 170)}; }`,
    );
    expect(css).toContain(".cover-page, .cover-page img { width: 148mm; height: 210mm; }");
    expect(css).toContain(`.title-page { padding-top: ${mm(60 * sy)}; }`);
    expect(css).toContain(`.copyright-page { padding-top: ${mm(120 * sy)}; }`);
    expect(css).toContain(`.chapter-head { padding-top: ${mm(34 * sy)}; }`);
    expect(css).toContain(`.end-image-page img { max-height: ${mm(165 * sy)}; }`);
  });

  it("sets MediaBox and CropBox to the preset's exact size", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([419.76, 595.2]);
    const out = await PDFDocument.load(await normalisePdf(await doc.save(), PAGE_SIZES.a5));
    const box = out.getPage(0).getMediaBox();
    expect(box.width).toBeCloseTo((148 / 25.4) * 72, 2);
    expect(box.height).toBeCloseTo((210 / 25.4) * 72, 2);
  });

  it("fits code to the preset's text width; the default width keeps today's sizes", () => {
    const line = `<pre><code>${"x".repeat(90)}</code></pre>`;
    expect(fitPreBlocks(line)).toBe(fitPreBlocks(line, { textWidth: 128, factor: 1 }));
    const size = (html: string) => Number(/font-size: ([\d.]+)pt/.exec(html)![1]);
    expect(
      size(fitPreBlocks(line, { textWidth: pageLayout(PAGE_SIZES.a5).textWidth, factor: 1 })),
    ).toBeLessThan(size(fitPreBlocks(line)));
  });
});
