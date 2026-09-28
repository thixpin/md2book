import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { BookError } from "../errors.ts";
import { normalizeFontStyle, normalizeLanguage } from "./options.ts";
import { bookJson, sampleChapter } from "./templates.ts";

export interface InitOptions {
  /** Target directory (default: current directory). */
  dir?: string;
  /** `my`, `mm`, `myanmar`, `en` or `english`. */
  lang: string;
  /** `sans` (default) or `serif`. */
  font?: string;
  title: string;
  author: string;
}

/** `book-build init`: writes book.json and chapters/chapter-01.md; never overwrites. */
export async function runInit(options: InitOptions): Promise<{ files: string[] }> {
  const language = normalizeLanguage(options.lang);
  const fontSet = normalizeFontStyle(options.font);
  const dir = resolve(options.dir ?? ".");
  const configPath = join(dir, "book.json");
  const chapterPath = join(dir, "chapters", "chapter-01.md");

  for (const path of [configPath, chapterPath]) {
    if (existsSync(path)) throw new BookError(path, "already exists; nothing written");
  }
  const config = bookJson({ language, fontSet, title: options.title, author: options.author });
  await mkdir(join(dir, "chapters"), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx" });
  await writeFile(chapterPath, sampleChapter(language), { flag: "wx" });
  return { files: [configPath, chapterPath] };
}
