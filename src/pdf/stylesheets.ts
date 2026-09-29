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
  if (!config.running_headers) {
    return "@page :left{@top-left{content:none}} @page :right{@top-right{content:none}}\n";
  }
  return `@page :left { @top-left { content: ${cssString(config.title)}; } }\n`;
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
