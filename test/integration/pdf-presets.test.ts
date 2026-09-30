// Spec 006: every page size (and font size) preset paginates validly (SC-002, research R-03).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadBook } from "../../src/book/load.ts";
import type { BookConfig } from "../../src/config/load.ts";
import {
  FONT_SIZES,
  PAGE_SIZES,
  pageLayout,
  type FontSizeId,
  type PageSizeId,
} from "../../src/config/presets.ts";
import { buildPdf } from "../../src/pdf/build.ts";
import { pdfFacts } from "../../src/qa/pdf-read.ts";
import { bookHeadings } from "../helpers/fixture-config.ts";
import { PRINT_MANIFEST } from "../helpers/fonts.ts";
import { tempDir } from "../helpers/temp.ts";
import { fixtureFontCache } from "../helpers/web.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

const PT_PER_MM = 72 / 25.4;
const TOLERANCE_PT = 1;

/** Every text item's left and right edge on each page, in points. */
async function textEdges(file: string) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const [x1, y1, x2, y2] = page.view as [number, number, number, number];
    const width = x2 - x1;
    const height = y2 - y1;
    const items = (await page.getTextContent()).items.flatMap((item) =>
      "str" in item && item.str.trim()
        ? [{ left: item.transform[4] as number, right: (item.transform[4] as number) + item.width }]
        : [],
    );
    pages.push({ width, height, items });
  }
  return pages;
}

async function build(pageId: PageSizeId, sizeId: FontSizeId) {
  const config: BookConfig = {
    ...(await bookHeadings()),
    page: { id: pageId, ...PAGE_SIZES[pageId] },
  };
  config.font = { ...config.font, size: { id: sizeId, ...FONT_SIZES[sizeId] } };
  const fontsDir = await fixtureFontCache(config, true);
  const { file } = await buildPdf(await loadBook(config), {
    out: join(tempDir(), "book"),
    printed: false,
    fontsDir,
    manifestPath: PRINT_MANIFEST,
  });
  return { config, file };
}

async function expectValid(config: BookConfig, file: string) {
  const { width, height } = config.page;
  expect(file.endsWith(`-${config.page.suffix}.pdf`)).toBe(true);

  // Every page has the preset's size and no text crosses the narrower side margin.
  const margin = Math.min(pageLayout(config.page).inside, pageLayout(config.page).outside);
  const edges = await textEdges(file);
  for (const [index, page] of edges.entries()) {
    expect(page.width).toBeCloseTo(width * PT_PER_MM, 1);
    expect(page.height).toBeCloseTo(height * PT_PER_MM, 1);
    if (index === 0) continue; // the full-bleed cover image page has no text
    for (const item of page.items) {
      expect(item.left, `page ${index + 1}`).toBeGreaterThanOrEqual(
        margin * PT_PER_MM - TOLERANCE_PT,
      );
      expect(item.right, `page ${index + 1}`).toBeLessThanOrEqual(
        page.width - margin * PT_PER_MM + TOLERANCE_PT,
      );
    }
  }

  // Headings keep two lines of their content (spec 004 US5); terminals and tables stay whole.
  const { lines: pages } = await pdfFacts(file);
  const count = (lines: string[], text: string) => lines.filter((l) => l.includes(text)).length;
  let headings = 0;
  for (const [index, page] of pages.entries()) {
    const body = page.filter(
      (line, i) => !(i === 0 && line.includes(config.author)) && !line.includes(config.title),
    );
    for (const [at, line] of body.entries()) {
      if (!line.includes("HEADING-")) continue;
      headings++;
      const below = body.length - 1 - at;
      expect(below >= 2 || at === 0, `page ${index + 1}: "${line}" has ${below} below`).toBe(true);
    }
    expect(count(body, "line 0: ok"), `terminal split, page ${index + 1}`).toBe(
      count(body, "line 5: ok"),
    );
    expect(count(body, "အတန်း 0"), `table split, page ${index + 1}`).toBe(count(body, "အတန်း 5"));
  }
  expect(headings).toBe(36);
  return pages.length;
}

describe("PDF presets: page sizes", { timeout: 300_000 }, () => {
  for (const pageId of Object.keys(PAGE_SIZES) as PageSizeId[]) {
    it(`builds a valid ${pageId} PDF`, async () => {
      const { config, file } = await build(pageId, "m");
      await expectValid(config, file);
    });
  }
});
