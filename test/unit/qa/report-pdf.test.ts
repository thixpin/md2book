import { describe, expect, it } from "vitest";
import { loadBook } from "../../../src/book/load.ts";
import { fontSetById, loadManifest } from "../../../src/fonts/manifest.ts";
import type { PdfChecks } from "../../../src/qa/pdf-checks.ts";
import type { PdfFacts } from "../../../src/qa/pdf-read.ts";
import { qaReport, type ReportInput } from "../../../src/qa/report.ts";
import { manuscriptStats } from "../../../src/qa/stats.ts";
import { bookMm } from "../../helpers/fixture-config.ts";
import { FIXTURE_MANIFEST } from "../../helpers/fonts.ts";

async function pdfSection(pdf: ReportInput["pdf"]): Promise<string[]> {
  const book = await loadBook(await bookMm());
  const set = fontSetById(await loadManifest(FIXTURE_MANIFEST), "my-sans");
  const report = qaReport({
    book,
    issues: [],
    set,
    fontsCommand: "md2book fonts",
    pdf,
    generated: new Date(2026, 8, 29, 12, 0, 0),
  });
  const start = report.indexOf("## PDF");
  return report.slice(start, report.indexOf("\n## ", start + 3)).split("\n");
}

const FACTS: PdfFacts = {
  pages: 164,
  sizeMm: [170, 240],
  fonts: ["AAAAAA+NotoSansMyanmar-Bold", "BAAAAA+NotoSansMyanmar-Regular"],
  lines: [],
  text: "",
};
const CHECKS: PdfChecks = {
  chapterStarts: new Map([
    ["ch01", 5],
    ["ch02", 13],
  ]),
  shortPages: [
    [12, 2],
    [40, 1],
  ],
  textChars: 146674,
  replacement: 0,
  stray: [
    ["×", 7],
    ["'", 1],
  ],
  samples: [
    [1, "cover"],
    [5, "ch01-open"],
    [164, "last-page"],
  ],
};

describe("QA report: PDF section", () => {
  it("writes every line of contracts/qa-pdf.md for the screen edition", async () => {
    const book = await loadBook(await bookMm());
    const manuscript = manuscriptStats(book.chapters).charsNoSpace.toLocaleString("en-US");
    expect(
      await pdfSection({
        file: "/x/book-mm-170x240.pdf",
        printed: false,
        facts: FACTS,
        checks: CHECKS,
      }),
    ).toEqual([
      "## PDF",
      "",
      "- File: book-mm-170x240.pdf",
      "- Edition: screen",
      "- Pages: 164",
      "- Page size: 170.0 x 240.0 mm (target 170 x 240)",
      "- Fonts embedded: AAAAAA+NotoSansMyanmar-Bold, BAAAAA+NotoSansMyanmar-Regular",
      "- Body font size: 11 pt; line spacing 1.55; first-line indent 6 mm; no extra space between paragraphs",
      "- Margins: top 20 mm, bottom 22 mm, inside 24 mm, outside 18 mm",
      "- Chapter opening pages detected: 2 of 2",
      "- Nearly empty pages (3 lines or fewer, after front matter): [(12, 2), (40, 1)]",
      `- Extracted text characters (excl. whitespace): 146,674 (manuscript: ${manuscript}; PDF includes front matter, headers, page numbers)`,
      "- Text extraction check (copy/search): 0 replacement characters; non-Burmese non-ASCII characters present: [('×', 7), (\"'\", 1)] (all from the manuscript). Syllable-break zero-width spaces are layout-only and not part of the extracted text.",
      "- Extracted Burmese is in logical (typed) order: the PDF carries the text of each shaped cluster.",
      "- Sample renders in qa-pages/: page-001-cover.png, page-005-ch01-open.png, page-164-last-page.png",
      "",
    ]);
  });

  it("names the printed edition and writes the empty forms", async () => {
    const lines = await pdfSection({
      file: "/x/book-mm-170x240-printed.pdf",
      printed: true,
      facts: { ...FACTS, sizeMm: [170, 239.9], fonts: [] },
      checks: { ...CHECKS, shortPages: [], stray: [], chapterStarts: new Map() },
    });
    expect(lines).toContain("- Edition: printed (no cover page, black-and-white code)");
    expect(lines).toContain("- Page size: 170.0 x 239.9 mm (target 170 x 240)");
    expect(lines).toContain("- Fonts embedded: none detected");
    expect(lines).toContain("- Chapter opening pages detected: 0 of 2");
    expect(lines).toContain("- Nearly empty pages (3 lines or fewer, after front matter): none");
    expect(lines.join("\n")).toContain("non-Burmese non-ASCII characters present: none (all");
    expect(lines.join("\n")).not.toContain("Em dash");
  });

  it("says the PDF is not built when there is none", async () => {
    expect(await pdfSection(undefined)).toEqual(["## PDF", "", "- PDF not built.", ""]);
  });
});
