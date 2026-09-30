import { createHash } from "node:crypto";
import { basename } from "node:path";
import type { BookConfig } from "../config/load.ts";
import { defaultLayout } from "../config/presets.ts";
import type { Chapter } from "../manuscript/chapters.ts";
import type { Part } from "../manuscript/parts.ts";
import { tocListHtml } from "../manuscript/toc.ts";
import { escapeHtml as esc } from "../manuscript/text.ts";
import { icon } from "./icons.ts";
import { site } from "./site.ts";
import { edgeCss, type CoverFacts } from "./images.ts";

// Port of development-book/publish/web.py `reader()` (d235dbd): same elements, classes and data-*
// hooks, so the carried reader script and CSS work unchanged.

export const CHAPTER_PATH = "/chapters/{slug}.html";
export const chapterHref = (slug: string) => CHAPTER_PATH.replace("{slug}", slug);

export interface WebBook {
  config: BookConfig;
  chapters: Chapter[];
  parts: Part[];
  bookKey: string;
  coverName: string;
  backCoverName: string;
  facts: CoverFacts;
}

/**
 * Saved positions are page numbers, valid only for the same text, so stored data is namespaced
 * by book and by the published (snippet-expanded) chapter text.
 */
export function computeBookKey(config: BookConfig, outDir: string, chapters: Chapter[]): string {
  const text = chapters.map((ch) => ch.expandedMd ?? ch.bodyMd).join("");
  const digest = createHash("sha256").update(text).digest("hex").slice(0, 10);
  return `${config.strings.storage_prefix}:${basename(outDir)}:${digest}`;
}

/** Header toolbar: contents, search, bookmark, fullscreen. */
export function readerToolbar(): string {
  return (
    '<div class="reader-bar" role="toolbar" aria-label="Reader">' +
    '<button type="button" class="reader-tool" popovertarget="reader-contents" ' +
    `aria-label="Contents" title="Contents">${icon("list")}</button>` +
    '<button type="button" class="reader-tool" popovertarget="reader-search" ' +
    `aria-label="Search" title="Search this book">${icon("search")}</button>` +
    '<button type="button" class="reader-tool" popovertarget="reader-text" ' +
    `aria-label="Text size" title="Text size (+ / -)">${icon("a-large-small")}</button>` +
    '<button type="button" class="reader-tool" data-bookmark-toggle aria-pressed="false" ' +
    'aria-label="Bookmark page" title="Bookmark page">' +
    `${icon("bookmark")}${icon("bookmark-check")}</button>` +
    '<button type="button" class="reader-tool" data-fullscreen-toggle hidden ' +
    'aria-label="Enter fullscreen" title="Enter fullscreen (F)">' +
    `${icon("maximize-2")}${icon("minimize-2")}</button></div>`
  );
}

/** Non-default strings the reader reads from the page (spec 002 FR-021); omitted when default. */
function readerOptions(config: BookConfig): string {
  const s = config.strings;
  const options: [string, string, string][] = [
    ["data-folio-digits", s.chapter_digits, "myanmar"],
    ["data-name-cover", s.page_names.cover, "Cover"],
    ["data-name-contents", s.page_names.contents, "Contents"],
    ["data-name-back-cover", s.page_names.back_cover, "Back cover"],
  ];
  // md2book: the running layout, only when it differs from the default (the reader's own).
  const running = JSON.stringify(config.running);
  const runningAttr =
    running === JSON.stringify(defaultLayout) ? "" : ` data-running="${esc(running)}"`;
  // md2book: the home path, only when the site is served under a path (GitHub project Pages).
  const { root } = site(config);
  const rootAttr = root ? ` data-site-root="${esc(root)}/"` : "";
  return (
    options
      .filter(([, value, fallback]) => value !== fallback)
      .map(([name, value]) => ` ${name}="${esc(value)}"`)
      .join("") +
    runningAttr +
    rootAttr
  );
}

export function readerHtml(book: WebBook, openChapter: string): string {
  const { config, chapters, parts, facts } = book;
  const title = esc(config.title);
  const { root } = site(config);
  const back =
    '<section class="back-matter back-filler" data-front-matter aria-hidden="true"></section>' +
    '<section class="back-matter endpaper-page back-endpaper" data-front-matter aria-hidden="true"></section>' +
    '<section class="back-matter back-cover-page" data-front-matter role="img" ' +
    `aria-label="${title} back cover"></section>`;
  const front =
    '<section class="front-page cover-page" data-front-matter role="img" ' +
    `aria-label="${title} cover"></section>` +
    '<section class="front-page endpaper-page" data-front-matter aria-hidden="true"></section>' +
    '<section class="front-page contents-page" data-front-matter>' +
    `<h2>${esc(config.strings.contents_heading)}</h2>${tocListHtml(parts, chapters, root + CHAPTER_PATH)}</section>`;
  const sections = chapters
    .map(
      (ch) =>
        `<section class="book-chapter" data-chapter="${ch.slug}" data-title="${esc(ch.fullTitle)}" ` +
        `data-short-title="${esc(ch.title)}" data-href="${root}${chapterHref(ch.slug)}">` +
        `<header class="chapter-head"><p class="book-name">${title}</p>` +
        `<p class="chapter-number">${esc(ch.label)}</p><h1>${esc(ch.title)}</h1></header>` +
        `<div class="chapter-body">${ch.html ?? ""}</div></section>`,
    )
    .join("");
  const contents = chapters
    .map(
      (ch) =>
        `<li><a href="${root}${chapterHref(ch.slug)}" data-chapter="${ch.slug}">${esc(ch.fullTitle)}</a></li>`,
    )
    .join("");

  return (
    // md2book: `is-loading` shows only the cover until the reader script has laid out the book
    // (it removes the class); before that the flow is unpaginated and runs across the spine.
    `<div class="reader-shell is-loading" data-reader data-book-key="${book.bookKey}" ` +
    `data-book-title="${title}" data-author="${esc(config.author)}" data-open-chapter="${openChapter}" ` +
    `data-cover-src="${root}/${book.coverName}" data-back-cover-src="${root}/${book.backCoverName}" ` +
    `data-cover-ratio="${facts.ratio.toFixed(5)}" ` +
    `data-cover-edge="${edgeCss(facts.edge)}" style="--cover-edge: ${edgeCss(facts.edge)}"` +
    `${readerOptions(config)}>` +
    '<div class="book" data-book>' +
    // md2book: first in the book, before the book text, so the cover is fetched at once.
    '<div class="reader-loading" data-reader-loading>' +
    `<img class="reader-loading-cover" src="${root}/${book.coverName}" alt="" fetchpriority="high"/>` +
    '<span class="visually-hidden" role="status">Loading the book…</span></div>' +
    '<svg class="book-paper" data-book-paper aria-hidden="true"></svg>' +
    '<div class="reader-window" role="region" aria-label="Book page">' +
    `<article class="reader-flow">${front}${sections}${back}` +
    '<span class="flow-end" aria-hidden="true"></span></article></div>' +
    '<div class="book-gutter" aria-hidden="true"></div>' +
    '<span class="page-number" data-page-number="left" aria-hidden="true" hidden></span>' +
    '<span class="page-number" data-page-number="right" aria-hidden="true" hidden></span>' +
    '<span class="page-head" data-page-head="left" aria-hidden="true" hidden></span>' +
    '<span class="page-head" data-page-head="right" aria-hidden="true" hidden></span>' +
    '<div class="book-cover" data-book-cover aria-hidden="true">' +
    '<div class="cover-face" data-cover-front></div><div class="cover-face cover-back"></div></div>' +
    '<div class="book-cover book-back-cover" data-book-back-cover aria-hidden="true"></div>' +
    '<div class="turn-layer" data-turn-layer aria-hidden="true">' +
    '<div class="turn-under" data-turn-under></div>' +
    '<div class="turn-cast" data-turn-cast></div>' +
    '<div class="turn-sheet" data-turn-sheet></div></div>' +
    '<div class="book-crease" aria-hidden="true"></div></div>' +
    '<nav class="reader-controls" aria-label="Page navigation">' +
    '<button type="button" class="page-turn" data-page-previous ' +
    'aria-label="Previous page" title="Previous page (←)">' +
    `${icon("chevron-left")}<span class="nav-label">Previous</span></button>` +
    '<output class="page-status" aria-live="polite">' +
    '<span aria-hidden="true" data-page-indicator></span>' +
    '<span class="visually-hidden" data-page-status></span></output>' +
    '<button type="button" class="page-turn" data-page-next ' +
    'aria-label="Next page" title="Next page (→)">' +
    `<span class="nav-label">Next</span>${icon("chevron-right")}</button></nav>` +
    '<div class="reader-panel" id="reader-contents" popover>' +
    `<h2>Contents</h2><ol>${contents}</ol>` +
    '<h2 class="panel-section">Bookmarks</h2><ol data-bookmark-list></ol>' +
    '<p class="empty" data-bookmark-empty>No bookmarks yet.</p></div>' +
    '<div class="reader-panel" id="reader-search" popover>' +
    "<h2>Search this book</h2>" +
    '<input type="search" data-search-input autofocus aria-label="Search this book" ' +
    'placeholder="Word or phrase" autocomplete="off" spellcheck="false">' +
    '<p class="empty" data-search-status role="status"></p>' +
    "<ol data-search-results></ol></div>" +
    // Text size (md2book addition, spec 002 FR-024).
    '<div class="reader-panel" id="reader-text" popover>' +
    "<h2>Text size</h2>" +
    '<div class="text-size">' +
    '<button type="button" class="reader-tool" data-text-smaller aria-label="Smaller text" title="Smaller text (-)">' +
    '<span class="text-step-small" aria-hidden="true">A</span></button>' +
    '<output data-text-size aria-live="polite">100%</output>' +
    // md2book: shown while the book re-paginates at the new size.
    '<span class="text-size-busy" data-text-busy aria-hidden="true" hidden></span>' +
    '<button type="button" class="reader-tool" data-text-larger aria-label="Larger text" title="Larger text (+)">' +
    '<span class="text-step-large" aria-hidden="true">A</span></button>' +
    "</div></div></div>"
  );
}
