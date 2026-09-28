import { readFile } from "node:fs/promises";
import { chapterHeadingPattern, parseDigits } from "../config/language.ts";
import type { BookConfig } from "../config/load.ts";
import { BookError } from "../errors.ts";
import { findFiles, normalizeSource } from "./text.ts";

export interface SnippetInclude {
  path: string;
  region?: string;
  language?: string;
  /** `path` or `path#region`, as listed in the QA report. */
  ref: string;
}

export interface Chapter {
  index: number;
  slug: string;
  label: string;
  title: string;
  fullTitle: string;
  number: number;
  sections: string[];
  sourcePath: string;
  bodyMd: string;
  expandedMd?: string;
  includes?: SnippetInclude[];
  html?: string;
  plainText?: string;
  uncovered?: string[];
}

const SECTION_RE = /^##\s+(.+?)\s*$/gmu;

export async function loadChapters(config: BookConfig): Promise<Chapter[]> {
  const files = await findFiles(config.chapter_glob);
  if (files.length === 0) throw new BookError(config.chapter_glob, "no chapter files match");

  const heading = chapterHeadingPattern(config.language, config.strings.chapter_label);
  const chapters: Chapter[] = [];
  for (const [i, sourcePath] of files.entries()) {
    const lines = normalizeSource(await readFile(sourcePath, "utf8")).split("\n");
    const headIndex = lines.findIndex((line) => line.trim() !== "");
    const first = lines[headIndex] ?? "";
    const match = heading.exec(first);
    if (!match) throw new BookError(sourcePath, `first line is not a chapter heading: ${first}`);

    const bodyMd =
      lines
        .slice(headIndex + 1)
        .join("\n")
        .replace(/^\n+|\n+$/g, "") + "\n";
    const [, label, title] = match as unknown as [string, string, string];
    const index = i + 1;
    chapters.push({
      index,
      slug: `ch${String(index).padStart(2, "0")}`,
      label,
      title,
      fullTitle: `${label} - ${title}`,
      number: parseDigits(label.replace(/[^၀-၉0-9]/gu, "")),
      sections: [...bodyMd.matchAll(SECTION_RE)].map((m) => m[1]!),
      sourcePath,
      bodyMd,
    });
  }
  return chapters;
}
