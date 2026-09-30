import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { BookError } from "../errors.ts";
import {
  normalizeChapters,
  normalizeFontFamily,
  normalizeFontSize,
  normalizeLanguage,
  normalizePageSize,
} from "./options.ts";
import { bookJson, sampleChapter } from "./templates.ts";

export interface InitOptions {
  /** Target directory (default: current directory). */
  dir?: string;
  /** `my`, `mm`, `myanmar`, `en` or `english`. */
  lang: string;
  /** Legacy `sans` (default) or `serif`; `fontFamily` names the family directly. */
  font?: string;
  /** A font family id of the book's language (spec 006). */
  fontFamily?: string;
  /** `default` (170 × 240 mm), `a5`, `b5`, `a4` or `letter`. */
  pageSize?: string;
  /** `xs`, `s`, `m` (default), `l` or `xl`. */
  fontSize?: string;
  /** Chapter folder inside `dir` (default `chapters`). */
  chapters?: string;
  title: string;
  author: string;
}

/** `md2book init`: writes book.json and <chapters>/chapter-01.md; never overwrites. */
export async function runInit(options: InitOptions): Promise<{ files: string[] }> {
  const language = normalizeLanguage(options.lang);
  const family = normalizeFontFamily(language, options.fontFamily, options.font);
  const pageSize = normalizePageSize(options.pageSize);
  const fontSize = normalizeFontSize(options.fontSize);
  const chapters = normalizeChapters(options.chapters);
  const dir = resolve(options.dir ?? ".");
  const configPath = join(dir, "book.json");
  const chapterPath = join(dir, chapters, "chapter-01.md");

  for (const path of [configPath, chapterPath]) {
    if (existsSync(path)) throw new BookError(path, "already exists; nothing written");
  }
  const config = bookJson({
    language,
    fontFamily: family.id,
    pageSize,
    fontSize,
    chapters,
    title: options.title,
    author: options.author,
  });
  await mkdir(join(dir, chapters), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx" });
  await writeFile(chapterPath, sampleChapter(language), { flag: "wx" });
  return { files: [configPath, chapterPath] };
}
