import { extname } from "node:path";
import { decodeHTML } from "entities";
import type { Book } from "../book/load.ts";
import { frontMatterHtml } from "../epub/front-matter.ts";
import { tocListHtml } from "../manuscript/toc.ts";
import { escapeHtml } from "../manuscript/text.ts";
import { chapterHeadHtml } from "../markdown/chapter-head.ts";

// Print measure: 170 mm page minus 24 mm inside and 18 mm outside margins, minus pre padding.
const PRE_USABLE_MM = 123.0;
const PRE_MAX_PT = 8.3;
const PRE_MIN_PT = 6.0; // below this, long lines wrap instead
const MONO_ADVANCE_EM = 0.6; // Noto Sans Mono advance width

/** Visible length of the longest line of a <pre> body, in code points (Python `len`). */
function longestLine(fragment: string): number {
  return Math.max(
    0,
    ...fragment.split("\n").map((line) => [...decodeHTML(line.replace(/<[^>]+>/g, ""))].length),
  );
}

/** Port of build.py `fit_pre_blocks`: a font size per block so its longest line fits the measure. */
export function fitPreBlocks(fragment: string): string {
  return fragment.replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/g, (_, attrs: string, body: string) => {
    const longest = Math.max(longestLine(body), 1);
    const pt = Math.max(
      PRE_MIN_PT,
      Math.min(PRE_MAX_PT, PRE_USABLE_MM / ((longest * MONO_ADVANCE_EM * 25.4) / 72)),
    );
    return `<pre${attrs} style="font-size: ${pt.toFixed(2)}pt">${body}</pre>`;
  });
}

// Chromium's line breaker leaves large gaps in justified Burmese (research R-03), so a
// zero-width space goes before every syllable-initial consonant: a consonant not preceded by a
// virama and not followed by an asat or a virama. Code is left alone.
const SYLLABLE_BREAK = /(?<=[\u1000-\u109F])(?<!\u1039)(?=[\u1000-\u1021](?![\u103A\u1039]))/gu;
const PRE_CODE_OR_TAG = /(<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>|<[^>]+>)/;

/** Port of build.py `add_syllable_breaks`. */
export function addSyllableBreaks(fragment: string): string {
  return fragment
    .split(PRE_CODE_OR_TAG)
    .map((piece) => (piece.startsWith("<") ? piece : piece.replace(SYLLABLE_BREAK, "\u200b")))
    .join("");
}

export interface PrintDocumentOptions {
  printed: boolean;
  /** Stylesheet names served at `/css/<name>`, in cascade order. */
  stylesheets: string[];
  /** The end image file, when the gate lets it in. */
  endImage?: string;
}

/** Served path of the cover or end image: `/book/<name>.<lower-case extension>`. */
export function bookImagePath(name: "cover" | "end", file: string): string {
  return `/book/${name}${extname(file).toLowerCase()}`;
}

/**
 * The print document (port of build.py `build_pdf`, data-model.md → PrintDocument). Paged.js
 * starts only when the renderer calls `preview()`, after the fonts have loaded.
 */
export function printDocument(book: Book, options: PrintDocumentOptions): string {
  const { config, chapters, parts } = book;
  const title = escapeHtml(config.title);
  const { titlePage, copyrightPage } = frontMatterHtml(config);
  const head =
    options.stylesheets.map((name) => `<link rel="stylesheet" href="/css/${name}"/>`).join("") +
    "<script>window.PagedConfig = { auto: false };</script>" +
    '<script src="/pagedjs/paged.polyfill.js"></script>' +
    '<script src="/pagedjs/handler.js"></script>';
  const pieces = [
    `<!DOCTYPE html><html lang="${config.language}"><head><meta charset="utf-8"/>`,
    `<title>${title}</title>${head}</head>`,
    `<body data-title="${title}">`,
  ];
  if (!options.printed) {
    pieces.push(
      `<div class="cover-page"><img src="${bookImagePath("cover", config.cover)}" alt="Cover"/></div>`,
    );
  }
  pieces.push(
    `<section class="front">${titlePage}</section>`,
    `<section class="front">${copyrightPage}</section>`,
    `<section class="front toc-page"><h1>${escapeHtml(config.strings.contents_heading)}</h1>` +
      `${tocListHtml(parts, chapters, "#{slug}")}</section>`,
  );
  for (const ch of chapters) {
    const classes = ["chapter", ch.index % 2 ? "group-a" : "group-b"];
    if (config.recto_chapter_start) classes.push("recto");
    pieces.push(
      `<section class="${classes.join(" ")}" id="${ch.slug}">` +
        chapterHeadHtml(ch) +
        fitPreBlocks(addSyllableBreaks(ch.html ?? "")) +
        "</section>",
    );
  }
  if (options.endImage) {
    // Final content page: the illustration alone, on a page with no header or folio.
    pieces.push(
      `<section class="end-image-page"><img src="${bookImagePath("end", options.endImage)}" alt=""/></section>`,
    );
  }
  pieces.push("</body></html>");
  return pieces.join("\n");
}
