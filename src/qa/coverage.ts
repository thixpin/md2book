import { join } from "node:path";
import * as fontkit from "fontkit";
import { unicodeName } from "unicode-name";
import type { FontSet } from "../fonts/manifest.ts";
import type { Chapter } from "../manuscript/chapters.ts";
import { pyWhitespace } from "./stats.ts";

export interface Coverage {
  myanmar: number;
  latin: number;
  outside: { char: string; count: number; code: string; name: string }[];
}

const isMyanmarBlock = (cp: number) =>
  (cp >= 0x1000 && cp <= 0x109f) || (cp >= 0xa9e0 && cp <= 0xaa7f);

/**
 * Port of qa.py `font_coverage`: the union of the set's body-regular and mono-regular cmaps;
 * Myanmar-block code points count as Myanmar, the rest of the union as Latin; characters above
 * U+0020 that are not whitespace are counted; uncovered ones listed by count (ties in first-seen
 * order, like Python's Counter).
 */
export function fontCoverage(chapters: Chapter[], set: FontSet, fontsDir: string): Coverage {
  const covered = new Set<number>();
  for (const role of ["body-regular", "mono-regular"]) {
    const face = set.faces.find((f) => f.role === role)!;
    const font = fontkit.openSync(join(fontsDir, face.file)) as fontkit.Font;
    for (const cp of font.characterSet) covered.add(cp);
  }
  const counts = new Map<string, number>();
  for (const ch of chapters) {
    for (const c of ch.plainText ?? "") {
      if (c.codePointAt(0)! > 32 && !pyWhitespace.test(c)) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  const result: Coverage = { myanmar: 0, latin: 0, outside: [] };
  for (const [c, n] of counts) {
    const cp = c.codePointAt(0)!;
    if (covered.has(cp) && isMyanmarBlock(cp)) result.myanmar += n;
    else if (covered.has(cp)) result.latin += n;
    else {
      result.outside.push({
        char: c,
        count: n,
        code: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
        name: unicodeName(c) ?? "?",
      });
    }
  }
  result.outside.sort((a, b) => b.count - a.count);
  return result;
}
