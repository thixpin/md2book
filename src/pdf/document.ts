import { decodeHTML } from "entities";

// Print measure: 170 mm page minus 24 mm inside and 18 mm outside margins, minus pre padding.
const PRE_USABLE_MM = 123.0;
const PRE_MAX_PT = 8.3;
const PRE_MIN_PT = 6.0; // below this, long lines wrap instead
const MONO_ADVANCE_EM = 0.6; // Noto Sans Mono advance width

/** Visible length of the longest line of a <pre> body, in code points (Python `len`). */
function longestLine(fragment: string): number {
  return Math.max(
    0,
    ...fragment.split("\n").map((line) => [...decodeHTML(line.replace(/<[^>]+>/g, ""))].length),
  );
}

/** Port of build.py `fit_pre_blocks`: a font size per block so its longest line fits the measure. */
export function fitPreBlocks(fragment: string): string {
  return fragment.replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/g, (_, attrs: string, body: string) => {
    const longest = Math.max(longestLine(body), 1);
    const pt = Math.max(
      PRE_MIN_PT,
      Math.min(PRE_MAX_PT, PRE_USABLE_MM / ((longest * MONO_ADVANCE_EM * 25.4) / 72)),
    );
    return `<pre${attrs} style="font-size: ${pt.toFixed(2)}pt">${body}</pre>`;
  });
}

// Chromium's line breaker leaves large gaps in justified Burmese (research R-03), so a
// zero-width space goes before every syllable-initial consonant: a consonant not preceded by a
// virama and not followed by an asat or a virama. Code is left alone.
const SYLLABLE_BREAK = /(?<=[က-႟])(?<!္)(?=[က-အ](?![်္]))/gu;
const PRE_CODE_OR_TAG = /(<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>|<[^>]+>)/;

/** Port of build.py `add_syllable_breaks`. */
export function addSyllableBreaks(fragment: string): string {
  return fragment
    .split(PRE_CODE_OR_TAG)
    .map((piece) => (piece.startsWith("<") ? piece : piece.replace(SYLLABLE_BREAK, "​")))
    .join("");
}
