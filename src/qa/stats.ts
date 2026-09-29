import { formatDigits } from "../config/language.ts";
import type { BookConfig } from "../config/load.ts";
import type { Chapter } from "../manuscript/chapters.ts";

/** Exactly Python's `str.isspace` characters (JS `\s` differs: it adds U+FEFF, lacks \x1c–\x1f, \x85). */
export const PY_WS =
  "\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
export const pyWhitespace = new RegExp(`[${PY_WS}]`, "u");
const pyWhitespaceAll = new RegExp(`[${PY_WS}]`, "gu");
const pyWhitespaceRuns = new RegExp(`[${PY_WS}]+`, "u");

export interface ManuscriptStats {
  chars: number;
  charsNoSpace: number;
  myanmarChars: number;
  tokens: number;
}

/** Port of qa.py `manuscript_stats` over each chapter's plain text (code-point counts). */
export function manuscriptStats(chapters: Chapter[]): ManuscriptStats {
  const stats = { chars: 0, charsNoSpace: 0, myanmarChars: 0, tokens: 0 };
  for (const ch of chapters) {
    const text = ch.plainText ?? "";
    const chars = [...text];
    stats.chars += chars.length;
    stats.charsNoSpace += [...text.replace(pyWhitespaceAll, "")].length;
    stats.myanmarChars += chars.filter((c) => c >= "က" && c <= "႟").length;
    stats.tokens += text.split(pyWhitespaceRuns).filter(Boolean).length;
  }
  return stats;
}

/** Labels equal the expected label for positions 1..N in the book's heading shape and digits. */
export function chapterOrderOk(chapters: Chapter[], config: BookConfig): boolean {
  const { chapter_label: word, chapter_digits: digits } = config.strings;
  return chapters.every((ch) => {
    const n = formatDigits(ch.index, digits);
    return ch.label === (config.language === "my" ? `${word} (${n})` : `${word} ${n}`);
  });
}
