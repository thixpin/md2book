import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Chapter } from "../manuscript/chapters.ts";
import { PY_WS } from "./stats.ts";

const MAX_ISSUES = 200;
const SPECIALS: [string, string][] = [
  ["\uFFFD", "U+FFFD replacement char"],
  ["\u200B", "zero-width space"],
  ["\u00A0", "no-break space"],
  ["\uFEFF", "BOM"],
];
const NWS = `[^${PY_WS}]`;
const WS = `[${PY_WS}]`;
const DUP_WORD = new RegExp(`(?<!${NWS})(${NWS}{2,})${WS}+\\1(?!${NWS})`, "gu");
const STRIP = new RegExp(`^${WS}+|${WS}+$`, "gu");

/** Python's `repr()` for the short strings in the report. */
export function pyRepr(text: string): string {
  if (text.includes("'") && !text.includes('"')) return `"${text}"`;
  return `'${text.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

const count = (text: string, sub: string) => text.split(sub).length - 1;
const lineAt = (text: string, index: number) => count(text.slice(0, index), "\n") + 1;
const isControl = (c: string) => {
  const code = c.codePointAt(0)!;
  return (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) && c !== "\n" && c !== "\t";
};

/**
 * Port of qa.py `unicode_checks` on each chapter's raw source, read like Python's text mode
 * (`\r\n` and `\r` become `\n`). Reports only; never changes a file.
 */
export async function unicodeChecks(chapters: Chapter[]): Promise<string[]> {
  const issues: string[] = [];
  for (const ch of chapters) {
    const raw = (await readFile(ch.sourcePath, "utf8")).replace(/\r\n?/g, "\n");
    const name = basename(ch.sourcePath);
    if (raw.normalize("NFC") !== raw)
      issues.push(`${name}: text is not NFC-normalized (build normalizes it)`);
    for (const [char, label] of SPECIALS) {
      const n = count(raw, char);
      if (n) issues.push(`${name}: ${n} x ${label}`);
    }
    const controls = [...raw].filter(isControl).length;
    if (controls) issues.push(`${name}: ${controls} control characters`);
    for (const m of raw.matchAll(/([ါ-ှ])\1/gu)) {
      issues.push(`${name}:${lineAt(raw, m.index)}: doubled vowel/medial sign ${pyRepr(m[0])}`);
    }
    for (const m of raw.matchAll(/(။။|၊၊|။၊|၊။)/gu)) {
      issues.push(`${name}:${lineAt(raw, m.index)}: doubled punctuation ${pyRepr(m[0])}`);
    }
    const spaceBefore = [...raw.matchAll(new RegExp(`${NWS} [။၊]`, "gu"))].length;
    if (spaceBefore)
      issues.push(`${name}: ${spaceBefore} x space before ။/၊ (reported, not changed)`);

    let inCode = false;
    for (const [i, line] of raw.split("\n").entries()) {
      if (line.startsWith("```")) {
        inCode = !inCode;
        continue;
      }
      if (inCode) continue;
      const lineNo = i + 1;
      if (line.replace(STRIP, "").includes("  "))
        issues.push(`${name}:${lineNo}: double space inside prose line`);
      for (const m of line.matchAll(DUP_WORD)) {
        const word = m[1]!;
        if (/[က-႟]/u.test(word) && [...word].length >= 4) {
          issues.push(`${name}:${lineNo}: repeated word ${pyRepr(word)}`);
        }
      }
      if (/<[a-zA-Z/][^>]*>/.test(line)) issues.push(`${name}:${lineNo}: HTML tag in manuscript`);
    }
  }
  return issues;
}

/** Report lines: at most 200 issues, then `- ... N more`. */
export function formatIssues(issues: string[]): string[] {
  if (issues.length === 0) {
    return [
      "- No issues found (NFC, no replacement/control chars, no doubled signs or punctuation, no repeated words, no HTML tags).",
    ];
  }
  const lines = issues.slice(0, MAX_ISSUES).map((issue) => `- ${issue}`);
  if (issues.length > MAX_ISSUES) lines.push(`- ... ${issues.length - MAX_ISSUES} more`);
  return lines;
}
