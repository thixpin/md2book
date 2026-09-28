import type { Chapter } from "../manuscript/chapters.ts";
import { escapeHtml } from "../manuscript/text.ts";

export function chapterHeadHtml(chapter: Pick<Chapter, "label" | "title">): string {
  return (
    `<header class="chapter-head"><p class="chapter-number">${escapeHtml(chapter.label)}</p>` +
    `<h1>${escapeHtml(chapter.title)}</h1></header>`
  );
}
