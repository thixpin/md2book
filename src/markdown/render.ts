import MarkdownIt from "markdown-it";
import type { SeriesStrings } from "../config/language.ts";
import type { Chapter } from "../manuscript/chapters.ts";
import { convertCallouts } from "./callouts.ts";
import { highlightFences } from "./highlight.ts";
import { htmlToText } from "./plain-text.ts";
import { tagWidePre } from "./wide.ts";

// CommonMark ends a blockquote at a blank line, so adjacent callouts stay separate without
// the python-markdown `_split_blockquotes` workaround (research R-02).
const md = new MarkdownIt({ html: true, xhtmlOut: true });

/** Markdown → XHTML fragment: render, highlight fences, callouts, then wide tagging. */
export function renderMarkdown(markdown: string, strings: SeriesStrings): string {
  const html = highlightFences(md.render(markdown));
  return tagWidePre(convertCallouts(html, strings.callout_titles));
}

/** Sets `chapter.html` and `chapter.plainText` from the expanded (or raw) body. */
export function renderChapter(chapter: Chapter, strings: SeriesStrings): void {
  chapter.html = renderMarkdown(chapter.expandedMd ?? chapter.bodyMd, strings);
  chapter.plainText = htmlToText(chapter.html);
}
