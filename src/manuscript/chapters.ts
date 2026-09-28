import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { chapterHeadingPattern, parseDigits } from "../config/language.ts";
import type { BookConfig } from "../config/load.ts";
import { BookError } from "../errors.ts";
import { compareCodePoints, findFiles, normalizeSource } from "./text.ts";

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
  const chapters: Chapter[] = [];
  for (const [i, sourcePath] of files.entries()) {
    chapters.push(await parseChapter(sourcePath, config, i + 1));
  }
  return chapters;
}

const LIST_KEY = "web_published_chapters";

/**
 * Web edition: only the files named in `web_published_chapters` are opened (Constitution V).
 * Each chapter's index — and so its slug — is its chapter number, not its position.
 */
export async function loadPublishedChapters(config: BookConfig): Promise<Chapter[]> {
  const names: unknown = config.web_published_chapters;
  if (!Array.isArray(names) || names.length === 0 || !names.every((n) => typeof n === "string")) {
    throw new BookError(LIST_KEY, "must be a non-empty list of chapter file names");
  }
  const chapterDir = dirname(config.chapter_glob);
  const files: string[] = [];
  for (const name of names) {
    const path = resolve(chapterDir, name);
    if (dirname(path) !== chapterDir || basename(path) !== name || extname(name) !== ".md") {
      throw new BookError(name, "published chapter must be a chapter file name");
    }
    if (!existsSync(path)) throw new BookError(name, "published chapter not found");
    if (files.includes(path)) throw new BookError(name, "duplicate published chapter");
    files.push(path);
  }
  const chapters: Chapter[] = [];
  for (const path of files.sort(compareCodePoints)) chapters.push(await parseChapter(path, config));
  const numbers = chapters.map((c) => c.number);
  if (new Set(numbers).size !== numbers.length) {
    throw new BookError(LIST_KEY, "published chapters contain duplicate chapter numbers");
  }
  return chapters;
}

/** Parses one chapter file; `index` defaults to the chapter number (web slugs). */
async function parseChapter(
  sourcePath: string,
  config: BookConfig,
  index?: number,
): Promise<Chapter> {
  const heading = chapterHeadingPattern(config.language, config.strings.chapter_label);
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
  const number = parseDigits(label.replace(/[^၀-၉0-9]/gu, ""));
  const position = index ?? number;
  return {
    index: position,
    slug: `ch${String(position).padStart(2, "0")}`,
    label,
    title,
    fullTitle: `${label} - ${title}`,
    number,
    sections: [...bodyMd.matchAll(SECTION_RE)].map((m) => m[1]!),
    sourcePath,
    bodyMd,
  };
}
