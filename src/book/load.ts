import type { BookConfig } from "../config/load.ts";
import { loadChapters, type Chapter } from "../manuscript/chapters.ts";
import { loadParts, type Part } from "../manuscript/parts.ts";
import { expandSnippets } from "../manuscript/snippets.ts";
import { renderChapter } from "../markdown/render.ts";

export interface Book {
  config: BookConfig;
  chapters: Chapter[];
  parts: Part[];
}

/** The whole book (all chapters of `chapter_glob`), expanded and rendered: EPUB, QA and PDF input. */
export async function loadBook(config: BookConfig): Promise<Book> {
  const chapters = await loadChapters(config);
  const parts = await loadParts(config, chapters);
  for (const ch of chapters) {
    expandSnippets(ch, config.code_root);
    renderChapter(ch, config.strings, chapters);
  }
  return { config, chapters, parts };
}
