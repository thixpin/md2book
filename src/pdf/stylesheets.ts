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
 * Per-book rules, last in the cascade: running heads and feet (author request). Outside = the edge
 * away from the spine. Header: author outside, current chapter title inside; footer: page number
 * outside, book title inside; all four in the folio's style. Chapter one is page 1 (the front
 * matter is not numbered) and Myanmar books use Myanmar digits, as in the web reader. The book
 * title and author are written as strings (Paged.js ignores `string-set` from `attr()`).
 */
function bookCss(config: BookConfig): string {
  const style = config.strings.chapter_digits === "myanmar" ? ", myanmar" : "";
  const type = "font-size: 9pt; color: #333;";
  const head = config.running_headers
    ? (content: string) =>
        `content: ${content}; ${type} vertical-align: bottom; padding-bottom: 3mm;`
    : () => "content: none;";
  // assets/paged-handler.js writes each page's number as --md2book-folio.
  const foot = (content: string) =>
    `content: ${content}; ${type} vertical-align: top; padding-top: 4mm;`;
  const author = cssString(config.author);
  const title = cssString(config.title);
  const chapter = "string(chaptertitle)";
  const folio = "var(--md2book-folio)";
  const none = "content: none;";
  const noMargins = `@top-left { ${none} } @top-right { ${none} } @bottom-left { ${none} } @bottom-right { ${none} }`;
  return [
    `@page { @bottom-center { ${none} } }`,
    `@page :left { @top-left { ${head(author)} } @top-right { ${head(chapter)} } @bottom-left { ${foot(folio)} } @bottom-right { ${foot(title)} } }`,
    `@page :right { @top-left { ${head(chapter)} } @top-right { ${head(author)} } @bottom-left { ${foot(title)} } @bottom-right { ${foot(folio)} } }`,
    `@page :blank { ${noMargins} }`,
    `@page front { ${noMargins} }`,
    `@page cover { ${noMargins} }`,
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
