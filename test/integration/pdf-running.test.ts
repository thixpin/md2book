// The book's `running` layout in a real PDF: inner and outer mirror between left and right pages;
// center parts sit in the middle of the page.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadBook } from "../../src/book/load.ts";
import { pageLayout } from "../../src/config/presets.ts";
import { buildPdf } from "../../src/pdf/build.ts";
import { bookHeadings } from "../helpers/fixture-config.ts";
import { PRINT_MANIFEST } from "../helpers/fonts.ts";
import { tempDir } from "../helpers/temp.ts";
import { fixtureFontCache } from "../helpers/web.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

/** Per page: its width and the text items (with their horizontal centre) near the top and foot. */
async function margins(file: string) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const [x1, y1, x2, y2] = page.view as [number, number, number, number];
    const items = (await page.getTextContent()).items.flatMap((item) =>
      "str" in item && item.str.trim()
        ? [
            {
              text: item.str.trim(),
              x: item.transform[4] - x1 + item.width / 2,
              y: item.transform[5] - y1,
            },
          ]
        : [],
    );
    const height = y2 - y1;
    pages.push({
      number: n,
      width: x2 - x1,
      top: items.filter((i) => i.y > height * 0.9),
      foot: items.filter((i) => i.y < height * 0.08),
    });
  }
  return pages;
}

describe("PDF running heads and feet", { timeout: 180_000 }, () => {
  it("mirrors inner and outer on left and right pages and centres the center slots", async () => {
    const base = await bookHeadings();
    const config = {
      ...base,
      // An ASCII title, so pdf.js reads it as one text run (Burmese comes out per shaped cluster).
      title: "Running Test Book",
      running: {
        top: { inner: "author", center: "book-title", outer: "none" },
        bottom: { inner: "none", center: "page-number", outer: "none" },
      } as const,
    };
    const fontsDir = await fixtureFontCache(config, true);
    const { file } = await buildPdf(await loadBook(config), {
      out: join(tempDir(), "book"),
      printed: false,
      fontsDir,
      manifestPath: PRINT_MANIFEST,
    });
    const sides = { left: 0, right: 0 };
    for (const page of await margins(file)) {
      const author = page.top.find((i) => i.text === config.author);
      if (!author) continue; // pages without running heads (front matter, chapter openings)
      // Paged.js puts the first page on the right: odd pages are right pages.
      const side = page.number % 2 === 1 ? "right" : "left";
      sides[side]++;
      // Inner is toward the spine: the right half of a left page, the left half of a right page.
      if (side === "left") expect(author.x, `page ${page.number}`).toBeGreaterThan(page.width / 2);
      else expect(author.x, `page ${page.number}`).toBeLessThan(page.width / 2);
      // The running head's own line (the author's baseline), not the first line of text.
      // Center slots are centred on the text block (like the web reader), which sits off the
      // page's middle: the inside margin is wider than the outside one.
      const layout = pageLayout(config.page);
      const pt = 72 / 25.4;
      const block =
        ((side === "left" ? layout.outside : layout.inside) + layout.textWidth / 2) * pt;
      const title = page.top.find((i) => i.text === config.title && Math.abs(i.y - author.y) < 1)!;
      expect(Math.abs(title.x - block), `title, page ${page.number}`).toBeLessThan(1.5);
      const folio = page.foot.find((i) => /^[0-9၀-၉]+$/.test(i.text))!;
      expect(Math.abs(folio.x - block), `folio, page ${page.number}`).toBeLessThan(1.5);
      expect(page.foot.map((i) => i.text)).toEqual([folio.text]); // nothing else in the foot
    }
    expect(sides.left).toBeGreaterThan(0);
    expect(sides.right).toBeGreaterThan(0);
  });
});
