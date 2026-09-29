import { basename } from "node:path";
import type { Book } from "../book/load.ts";
import type { FontSet } from "../fonts/manifest.ts";
import type { Coverage } from "./coverage.ts";
import type { EpubCheckResult } from "./epub-checks.ts";
import { chapterOrderOk, manuscriptStats } from "./stats.ts";
import { formatIssues } from "./unicode.ts";

export interface ReportInput {
  book: Book;
  issues: string[];
  set: FontSet;
  /** Undefined when the font set is not cached. */
  coverage?: Coverage;
  fontsCommand: string;
  epub?: { file: string; checks: EpubCheckResult };
  generated: Date;
}

const n = (value: number) => value.toLocaleString("en-US");

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

  add("## PDF", "", "- PDF not built.", "");

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
