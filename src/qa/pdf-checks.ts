import type { Chapter } from "../manuscript/chapters.ts";
import type { PdfFacts } from "./pdf-read.ts";
import { PY_WS } from "./stats.ts";

export interface PdfChecks {
  /** Chapter slug → the page it opens on, in chapter order of detection. */
  chapterStarts: Map<string, number>;
  /** [page, non-empty lines] of pages after the front matter with 3 lines or fewer. */
  shortPages: [number, number][];
  /** Characters of the extracted text without (Python) whitespace. */
  textChars: number;
  /** U+FFFD count. */
  replacement: number;
  /** The 8 most common stray characters with their counts. */
  stray: [string, number][];
  /** [page, name] of the sample renders, sorted by page. */
  samples: [number, string][];
}

const WHITESPACE = new RegExp(`[${PY_WS}]`, "gu");
const PUNCTUATION_OR_SEPARATOR = /^[\p{P}\p{Z}]$/u;
const NOT_STRAY = new Set(["\u00A9", "\u200B"]);

/** Front matter pages as qa.py names them; the printed edition has no cover. */
export function frontPages(printed: boolean): string[] {
  return printed ? ["title", "copyright", "toc"] : ["cover", "title", "copyright", "toc"];
}

/** Port of qa.py `pdf_checks` (everything but reading and rendering the PDF). */
export function pdfChecks(facts: PdfFacts, chapters: Chapter[], printed: boolean): PdfChecks {
  const front = frontPages(printed);
  const chapterStarts = new Map<string, number>();
  const shortPages: [number, number][] = [];
  facts.lines.forEach((lines, index) => {
    const page = index + 1;
    const nonEmpty = lines.filter((line) => line.trim() !== "");
    if (page > front.length && nonEmpty.length <= 3) shortPages.push([page, nonEmpty.length]);
    const text = lines.join("\n");
    for (const ch of chapters) {
      if (chapterStarts.has(ch.slug) || nonEmpty.length >= 40) continue;
      if (!text.includes(ch.label) || !text.includes(ch.title)) continue;
      const opens = lines
        .slice(0, 6)
        .some((line, i) => line.trim() === ch.label && lines[i + 1]?.trim() === ch.title);
      if (opens) chapterStarts.set(ch.slug, page);
    }
  });

  const pageTexts = facts.lines.map((lines) => lines.join("\n"));
  const textChars = pageTexts.reduce(
    (sum, text) => sum + [...text.replace(WHITESPACE, "")].length,
    0,
  );
  const all = pageTexts.join("");
  const counts = new Map<string, number>();
  for (const c of all) {
    const code = c.codePointAt(0)!;
    if (code <= 0x7f || (code >= 0x1000 && code <= 0x109f)) continue;
    if (PUNCTUATION_OR_SEPARATOR.test(c) || NOT_STRAY.has(c)) continue;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  // Counter.most_common: by count, ties in first-seen order (Array.sort is stable).
  const stray = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const sample = new Map<number, string>(front.map((name, i) => [i + 1, name]));
  const at = (ch: Chapter | undefined) => (ch ? chapterStarts.get(ch.slug) : undefined);
  const first = at(chapters[0]);
  if (first) {
    sample.set(first, "ch01-open");
    sample.set(first + 1, "ch01-p2");
    sample.set(first + 2, "ch01-p3");
  }
  const mid = at(chapters[Math.floor(chapters.length / 2)]);
  if (mid) {
    sample.set(mid, "mid-chapter-open");
    sample.set(mid + 1, "mid-chapter-p2");
  }
  const last = at(chapters.at(-1));
  if (last) sample.set(last, "last-chapter-open");
  sample.set(facts.pages, "last-page");
  const samples = [...sample]
    .filter(([page]) => page >= 1 && page <= facts.pages)
    .sort((a, b) => a[0] - b[0]);

  return {
    chapterStarts,
    shortPages,
    textChars,
    replacement: all.split("\uFFFD").length - 1,
    stray,
    samples,
  };
}
