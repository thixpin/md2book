import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { BookConfig } from "../config/load.ts";
import type { FontSet } from "../fonts/manifest.ts";
import { substituteFonts } from "../web/assets.ts";

const ASSETS = fileURLToPath(new URL("../../assets/", import.meta.url));
const read = (path: string) => readFileSync(`${ASSETS}${path}`, "utf8");

export interface Stylesheet {
  name: string;
  css: string;
}

/** A CSS string literal. */
function cssString(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\a ")}"`;
}

/**
 * Per-book rules, last in the cascade: the book title as the left running header (Paged.js
 * ignores `string-set` from `attr()` on body), or no running headers at all.
 */
function bookCss(config: BookConfig): string {
  const headers = config.running_headers
    ? `@page :left { @top-left { content: ${cssString(config.title)}; } }\n`
    : "@page :left{@top-left{content:none}} @page :right{@top-right{content:none}}\n";
  return headers + folioCss(config);
}

/**
 * Page numbers as in the web reader (author request): chapter one is page 1 (the front matter is
 * not numbered), folios sit in the outside corner (left pages bottom left, right pages bottom
 * right), and books with Myanmar digits number pages and contents entries in Myanmar digits.
 */
function folioCss(config: BookConfig): string {
  const style = config.strings.chapter_digits === "myanmar" ? ", myanmar" : "";
  // assets/paged-handler.js writes each page's number as --md2book-folio.
  const folio =
    "content: var(--md2book-folio); font-size: 9pt; color: #333; vertical-align: top; padding-top: 4mm;";
  const none = "@bottom-left { content: none; } @bottom-right { content: none; }";
  return [
    "@page { @bottom-center { content: none; } }",
    `@page :left { @bottom-left { ${folio} } }`,
    `@page :right { @bottom-right { ${folio} } }`,
    `@page :blank { ${none} }`,
    `@page front { ${none} }`,
    `@page cover { ${none} }`,
    "#ch01 { counter-reset: page 1; }",
    `.toc-page li a::after { content: target-counter(attr(href url), page${style}); }`,
    "",
  ].join("\n");
}

/** The PDF stylesheets in cascade order (contracts/pdf-output.md), with the set's fonts. */
export function printStylesheets(set: FontSet, config: BookConfig, printed: boolean): Stylesheet[] {
  const carried = ["common.css", "print.css", ...(printed ? ["printed.css"] : [])];
  return [
    ...carried.map((name) => ({ name, css: substituteFonts(read(`css/${name}`), set) })),
    { name: "paged.css", css: read("css/paged.css") },
    { name: "book.css", css: bookCss(config) },
  ];
}
