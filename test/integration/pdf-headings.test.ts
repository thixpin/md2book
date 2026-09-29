import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadBook } from "../../src/book/load.ts";
import { buildPdf } from "../../src/pdf/build.ts";
import { pdfFacts } from "../../src/qa/pdf-read.ts";
import { bookHeadings } from "../helpers/fixture-config.ts";
import { PRINT_MANIFEST } from "../helpers/fonts.ts";
import { tempDir } from "../helpers/temp.ts";
import { fixtureFontCache } from "../helpers/web.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

const count = (lines: string[], text: string) => lines.filter((line) => line.includes(text)).length;

// The fixture puts headings (levels 2–6) at every position near a page foot, each followed by a
// paragraph, code block, list, table, terminal or callout (spec 004 User Story 5, SC-007).
describe("PDF: headings stay with their content", { timeout: 180_000 }, () => {
  for (const printed of [false, true]) {
    it(`keeps 2 lines of content under every heading (${printed ? "printed" : "screen"})`, async () => {
      const config = await bookHeadings();
      const fontsDir = await fixtureFontCache(config, true);
      const { file } = await buildPdf(await loadBook(config), {
        out: join(tempDir(), "book"),
        printed,
        fontsDir,
        manifestPath: PRINT_MANIFEST,
      });
      const { lines: pages } = await pdfFacts(file);
      let headings = 0;
      let atTop = 0;
      let atFoot = 0;
      for (const [index, page] of pages.entries()) {
        // The running header and footer are not content.
        const body = page.filter(
          (line, i) => !(i === 0 && line.includes(config.author)) && !line.includes(config.title),
        );
        for (const [at, line] of body.entries()) {
          if (!line.includes("HEADING-")) continue;
          headings++;
          const below = body.length - 1 - at;
          if (at === 0) atTop++;
          if (below <= 3) atFoot++;
          expect(
            below >= 2 || at === 0,
            `page ${index + 1}: "${line}" has ${below} lines below`,
          ).toBe(true);
        }
        // Terminals and tables are never split across pages (identical blocks: first and last
        // lines come in pairs on every page).
        expect(count(body, "line 0: ok"), `terminal split on page ${index + 1}`).toBe(
          count(body, "line 5: ok"),
        );
        expect(count(body, "အတန်း 0"), `table split on page ${index + 1}`).toBe(
          count(body, "အတန်း 5"),
        );
      }
      expect(headings).toBe(36);
      // The fixture really reaches the boundary: some headings moved to a page top, some sit near
      // a page foot with just enough below them.
      expect(atTop).toBeGreaterThan(0);
      expect(atFoot).toBeGreaterThan(0);
    });
  }
});
