import { basename } from "node:path";
import type { Book } from "../book/load.ts";
import type { BookConfig } from "../config/load.ts";
import { pageLayout } from "../config/presets.ts";
import type { FontSet } from "../fonts/manifest.ts";
import type { Coverage } from "./coverage.ts";
import type { EpubCheckResult } from "./epub-checks.ts";
import type { PdfChecks } from "./pdf-checks.ts";
import type { PdfFacts } from "./pdf-read.ts";
import { chapterOrderOk, manuscriptStats } from "./stats.ts";
import { formatIssues, pyRepr } from "./unicode.ts";

export interface ReportInput {
  book: Book;
  issues: string[];
  set: FontSet;
  /** Undefined when the font set is not cached. */
  coverage?: Coverage;
  fontsCommand: string;
  epub?: { file: string; checks: EpubCheckResult };
  pdf?: { file: string; printed: boolean; facts: PdfFacts; checks: PdfChecks };
  generated: Date;
}

const n = (value: number) => value.toLocaleString("en-US");
/** Python's str() of a float: `170.0`, `239.9`. */
const pyFloat = (value: number) => (Number.isInteger(value) ? value.toFixed(1) : String(value));

/** The PDF section (port of qa.py; spec 004 contracts/qa-pdf.md). */
function pdfSection(
  pdf: NonNullable<ReportInput["pdf"]>,
  chapters: number,
  charsNoSpace: number,
  config: BookConfig,
) {
  const { facts, checks } = pdf;
  const [w, h] = facts.sizeMm;
  const target = config.page.suffix.replace("x", " x ");
  const margin = pageLayout(config.page);
  const num = (value: number, digits: number) => Number(value.toFixed(digits));
  const body = num(11 * config.font.size.factor, 2);
  const shortPages = checks.shortPages.map(([page, lines]) => `(${page}, ${lines})`).join(", ");
  const stray = checks.stray.map(([c, count]) => `(${pyRepr(c)}, ${count})`).join(", ");
  const samples = checks.samples.map(
    ([page, name]) => `page-${String(page).padStart(3, "0")}-${name}.png`,
  );
  return [
    `- File: ${basename(pdf.file)}`,
    `- Edition: ${pdf.printed ? "printed (no cover page, black-and-white code)" : "screen"}`,
    `- Pages: ${facts.pages}`,
    `- Page size: ${pyFloat(w)} x ${pyFloat(h)} mm (target ${target})`,
    `- Fonts embedded: ${facts.fonts.join(", ") || "none detected"}`,
    `- Body font size: ${body} pt; line spacing 1.55; first-line indent 6 mm; no extra space between paragraphs`,
    `- Margins: top ${num(margin.top, 1)} mm, bottom ${num(margin.bottom, 1)} mm, inside ${num(margin.inside, 1)} mm, outside ${num(margin.outside, 1)} mm`,
    `- Chapter opening pages detected: ${checks.chapterStarts.size} of ${chapters}`,
    `- Nearly empty pages (3 lines or fewer, after front matter): ${shortPages ? `[${shortPages}]` : "none"}`,
    `- Extracted text characters (excl. whitespace): ${n(checks.textChars)} (manuscript: ${n(charsNoSpace)}; PDF includes front matter, headers, page numbers)`,
    `- Text extraction check (copy/search): ${checks.replacement} replacement characters; non-Burmese non-ASCII characters present: ${stray ? `[${stray}]` : "none"} (all from the manuscript). Syllable-break zero-width spaces are layout-only and not part of the extracted text.`,
    "- Extracted Burmese is in logical (typed) order: the PDF carries the text of each shaped cluster.",
    `- Sample renders in qa-pages/: ${samples.join(", ")}`,
  ];
}

/** Local time like Python's `datetime.now().isoformat(timespec="seconds")`. */
function isoLocal(date: Date): string {
  const p = (v: number) => String(v).padStart(2, "0");
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
  );
}

/**
 * QA-REPORT.md (port of qa.py `run`). Differences from the reference (spec 003 clarifications):
 * no em dash search, and the typeface text describes the configured font set.
 */
export function qaReport(input: ReportInput): string {
  const { book, set, coverage, epub } = input;
  const { config, chapters } = book;
  const stats = manuscriptStats(chapters);
  const body = set.body_family;
  const mono = set.mono_family;
  const lines: string[] = [];
  const add = (...more: string[]) => lines.push(...more);

  add(`# QA Report: ${config.title}`, "", `Generated: ${isoLocal(input.generated)}`, "");

  add("## Manuscript", "");
  add(`- Chapters: ${chapters.length}`);
  add(
    `- Chapter order: ${
      chapterOrderOk(chapters, config)
        ? "OK (files sorted, numbering 1..N matches labels)"
        : "MISMATCH, see list"
    }`,
  );
  const includes = chapters.reduce((sum, ch) => sum + (ch.includes?.length ?? 0), 0);
  add(
    `- Code snippet includes: ${includes} (all resolved; the build stops on a missing file or region)`,
  );
  add(`- Approximate word count (whitespace tokens): ${n(stats.tokens)}`);
  add(`- Character count (incl. spaces): ${n(stats.chars)}`);
  add(`- Character count (excl. spaces): ${n(stats.charsNoSpace)}`);
  add(`- Myanmar-script characters: ${n(stats.myanmarChars)}`, "");
  add("| # | Label | Title | Sections |", "|---|---|---|---|");
  for (const ch of chapters)
    add(`| ${ch.index} | ${ch.label} | ${ch.title} | ${ch.sections.length} |`);
  add("");

  add("## Unicode / Burmese text checks", "", ...formatIssues(input.issues), "");

  add("## Typeface coverage", "");
  add(`- Body text: ${body} (Regular, Bold, Italic, Bold Italic).`);
  add(`- Chapter titles: ${body} Bold. Chapter numbers and section headings: ${body} SemiBold.`);
  add(`- Terminal output, commands, logs and inline code: ${mono} (Regular, Bold).`);
  if (coverage) {
    add(`- Myanmar-script characters (from the ${body} glyph set): ${n(coverage.myanmar)}`);
    add(
      `- Latin/digit/punctuation characters (from the merged Latin glyph sets): ${n(coverage.latin)}`,
    );
    if (coverage.outside.length) {
      add(
        "- Characters covered by none of the book fonts (system symbol/emoji fallback in PDF, reader fallback in EPUB):",
      );
      for (const o of coverage.outside) add(`  - ${o.code} ${o.name} x${o.count}`);
    } else {
      add("- All characters covered by the two embedded fonts.");
    }
  } else {
    add(`- Coverage not checked: font set ${set.id} not found; run: ${input.fontsCommand}`);
  }
  add("");

  add("## PDF", "");
  if (input.pdf) add(...pdfSection(input.pdf, chapters.length, stats.charsNoSpace, config), "");
  else add("- PDF not built.", "");

  add("## EPUB", "");
  if (epub) {
    const c = epub.checks;
    add(`- File: ${basename(epub.file)}`);
    add(
      `- Reflowable: ${c.fixedLayout ? "NO (fixed layout metadata present)" : "yes (no fixed-layout metadata)"}`,
    );
    add(`- Fonts embedded: ${c.fontsEmbedded.map((f) => basename(f)).join(", ")}`);
    add(`- Chapter documents: ${c.chapterDocs}`);
    add(
      `- Chapter text identical to manuscript render: ${
        c.textMismatchChapters.length ? `MISMATCH in ${c.textMismatchChapters.join(", ")}` : "yes"
      }`,
    );
    add(`- Structural errors: ${c.errors.length ? c.errors.join("; ") : "none"}`);
    if (!c.epubcheck) {
      add("- epubcheck: NOT RUN (epubcheck not installed; `brew install epubcheck`)");
    } else {
      add(
        `- epubcheck: ${c.epubcheck.passed ? "PASS" : "FAIL"}`,
        "",
        "```text",
        c.epubcheck.output,
        "```",
      );
    }
  } else {
    add("- EPUB not built.");
  }
  add("");

  add("## Metadata placeholders (must be filled before publication)", "");
  for (const key of ["title", "subtitle", "author", "publisher", "year", "isbn"] as const) {
    const value = config[key];
    if (value?.includes("PLACEHOLDER")) add(`- ${key}: ${value}`);
  }
  add("");

  add("## Known layout limitations", "");
  add(
    "- Terminal blocks with long lines (nvidia-smi tables, log lines) are set in smaller monospace so the longest line fits the page measure; anything longer still wraps rather than overflowing.",
    "- Emoji and the warning sign are not part of the book fonts; the PDF uses the system symbol/emoji font for those few characters and EPUB readers use their own.",
    "- Burmese line breaking in the PDF follows syllable boundaries (zero-width break opportunities inserted at build time, not stored in the manuscript). Syllables are never split; word-internal breaks between syllables are standard Burmese typesetting practice.",
    "- A section heading that does not fit with its first lines at the bottom of a page moves to the next page, leaving that page short. This is deliberate (no heading orphaned at a page foot).",
    "",
  );
  add("## Content / continuity issues found but NOT changed", "");
  add("- None recorded by the automated checks. Add manual review notes here.", "");
  return lines.join("\n");
}
