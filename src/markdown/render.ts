import MarkdownIt from "markdown-it";
import type { SeriesStrings } from "../config/language.ts";
import type { Chapter } from "../manuscript/chapters.ts";
import { convertCallouts } from "./callouts.ts";
import { highlightFences } from "./highlight.ts";
import { linkContext, useBookLinks, type LinkContext } from "./links.ts";
import { htmlToText } from "./plain-text.ts";
import { tagWidePre } from "./wide.ts";

// CommonMark ends a blockquote at a blank line, so adjacent callouts stay separate without
// the python-markdown `_split_blockquotes` workaround (research R-02).
const md = new MarkdownIt({ html: true, xhtmlOut: true });
useBookLinks(md);

/**
 * Markdown → XHTML fragment: render, highlight fences, callouts, then wide tagging. With `links`,
 * links to chapter files and README.md point into the book (see `bookHrefs`).
 */
export function renderMarkdown(
  markdown: string,
  strings: SeriesStrings,
  links?: LinkContext,
): string {
  const html = highlightFences(md.render(markdown, { links }));
  return tagWidePre(convertCallouts(html, strings.callout_titles));
}

/**
 * Sets `chapter.html` and `chapter.plainText` from the expanded (or raw) body. `chapters` is the
 * edition's chapter set, which links to other chapter files resolve against.
 */
export function renderChapter(
  chapter: Chapter,
  strings: SeriesStrings,
  chapters?: Chapter[],
): void {
  const links = chapters ? linkContext(chapter, chapters) : undefined;
  chapter.html = renderMarkdown(chapter.expandedMd ?? chapter.bodyMd, strings, links);
  chapter.plainText = htmlToText(chapter.html);
}
