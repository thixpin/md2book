import { describe, expect, it } from "vitest";
import type { Chapter } from "../../../src/manuscript/chapters.ts";
import { pdfChecks } from "../../../src/qa/pdf-checks.ts";
import type { PdfFacts } from "../../../src/qa/pdf-read.ts";

const chapter = (i: number) =>
  ({ slug: `ch0${i}`, label: `Chapter ${i}`, title: `Title ${i}` }) as Chapter;
const CHAPTERS = [chapter(1), chapter(2), chapter(3)];
const body = (count: number) => Array.from({ length: count }, (_, i) => `line ${i}`);

function facts(lines: string[][]): PdfFacts {
  return {
    pages: lines.length,
    sizeMm: [170, 240],
    fonts: [],
    lines,
    text: lines.map((page) => page.join("\n")).join("\n"),
  };
}

// Screen edition: cover, title, copyright, contents, then chapters from page 5.
const SCREEN = facts([
  [],
  ["Book"],
  ["Book", "Copyright"],
  ["Contents", "Chapter 1 - Title 1 5"],
  ["Chapter 1", "Title 1", ...body(20)],
  ["Book", "6", ...body(30)],
  ["Title 1", "7", "short"],
  ["Book", "Chapter 2", "Title 2", ...body(5)], // a header line first, then the opening
  ["Title 2", "9", ...body(45), "Chapter 3", "Title 3"], // 40 lines or more: not an opening
  ["Chapter 3", "Title 3", ...body(2)],
  [],
]);

describe("pdfChecks", () => {
  it("finds chapter openings: label line directly above title line in the first 6 lines", () => {
    const { chapterStarts } = pdfChecks(SCREEN, CHAPTERS, false);
    expect([...chapterStarts]).toEqual([
      ["ch01", 5],
      ["ch02", 8],
      ["ch03", 10],
    ]);
  });

  it("lists pages after the front matter with 3 non-empty lines or fewer", () => {
    expect(pdfChecks(SCREEN, CHAPTERS, false).shortPages).toEqual([
      [7, 3],
      [11, 0],
    ]);
    // The printed edition's front matter is one page shorter.
    expect(pdfChecks(facts([[], ["a"], ["b"], ["c"]]), CHAPTERS, true).shortPages).toEqual([
      [4, 1],
    ]);
  });

  it("counts characters without Python whitespace, replacement characters and strays", () => {
    const text = facts([["a b\u00A0c\u200B", "×\uFFFD"], ["× ◦ © — “x” ၁"], ["é×"]]);
    const result = pdfChecks(text, CHAPTERS, false);
    expect(result.textChars).toBe(16); // Python \s removes spaces and the no-break space, not ZWSP
    expect(result.replacement).toBe(1);
    // Not ASCII, not Myanmar, not punctuation or separators, not © or ZWSP; most common first,
    // ties in first-seen order.
    expect(result.stray).toEqual([
      ["×", 3],
      ["\uFFFD", 1],
      ["◦", 1],
      ["é", 1],
    ]);
  });

  it("keeps at most the 8 most common stray characters", () => {
    const text = facts([["αβγδεζηθικ"]]);
    expect(
      pdfChecks(text, CHAPTERS, false)
        .stray.map(([c]) => c)
        .join(""),
    ).toBe("αβγδεζηθ");
  });

  it("names the sample pages like qa.py (later names win, sorted by page, within the PDF)", () => {
    expect(pdfChecks(SCREEN, CHAPTERS, false).samples).toEqual([
      [1, "cover"],
      [2, "title"],
      [3, "copyright"],
      [4, "toc"],
      [5, "ch01-open"],
      [6, "ch01-p2"],
      [7, "ch01-p3"],
      [8, "mid-chapter-open"],
      [9, "mid-chapter-p2"],
      [10, "last-chapter-open"],
      [11, "last-page"],
    ]);
    const printed = pdfChecks(
      facts([["t"], ["c"], ["toc"], ["Chapter 1", "Title 1"]]),
      [chapter(1)],
      true,
    );
    expect(printed.samples).toEqual([
      [1, "title"],
      [2, "copyright"],
      [3, "toc"],
      [4, "last-page"],
    ]);
  });
});
