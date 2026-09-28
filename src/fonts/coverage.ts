import { basename, join } from "node:path";
import * as fontkit from "fontkit";
import { warn } from "../errors.ts";
import type { Chapter } from "../manuscript/chapters.ts";
import type { FontSet } from "./manifest.ts";

export interface Uncovered {
  file: string;
  char: string;
}

/**
 * FR-046: warns once per (chapter file, character) the set's body face lacks, records the
 * characters on each chapter and returns them for the QA report. Never stops the run.
 */
export function checkCoverage(chapters: Chapter[], set: FontSet, fontsDir: string): Uncovered[] {
  const body = set.faces.find((face) => face.role === "body-regular")!;
  const font = fontkit.openSync(join(fontsDir, body.file)) as fontkit.Font;
  const result: Uncovered[] = [];
  for (const chapter of chapters) {
    const chars = [...new Set(chapter.plainText ?? chapter.bodyMd)].filter(
      (char) => !/\s/u.test(char) && !font.hasGlyphForCodePoint(char.codePointAt(0)!),
    );
    chapter.uncovered = chars;
    for (const char of chars) {
      const code = char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");
      warn(
        `${basename(chapter.sourcePath)}: U+${code} "${char}" is not covered by font set ${set.id}`,
      );
      result.push({ file: chapter.sourcePath, char });
    }
  }
  return result;
}
