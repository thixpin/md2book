import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { BookConfig } from "../config/load.ts";
import { pageLayout, type SlotValue } from "../config/presets.ts";
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
function bookCss(config: BookConfig, carried: string[]): string {
  const style = config.strings.chapter_digits === "myanmar" ? ", myanmar" : "";
  const type = `font-size: ${pt(9 * config.font.size.factor)}; color: #777;`;
  // What each running value prints; assets/paged-handler.js writes each page's number as
  // --md2book-folio.
  const CONTENT: Record<SlotValue, string | null> = {
    author: cssString(config.author),
    "book-title": cssString(config.title),
    "chapter-title": "string(chaptertitle)",
    "page-number": "var(--md2book-folio)",
    none: null,
  };
  const none = "content: none;";
  const slot = (value: SlotValue, line: "top" | "bottom") => {
    const content = CONTENT[value];
    if (content === null) return none;
    return line === "top"
      ? `content: ${content}; ${type} vertical-align: bottom; padding-bottom: 7.5mm;`
      : `content: ${content}; ${type} vertical-align: top; padding-top: 4mm;`;
  };
  // running_headers: false (PDF only) empties the whole top line.
  const running = config.running_headers
    ? config.running
    : { ...config.running, top: { inner: "none", center: "none", outer: "none" } as const };
  // Outer is the edge away from the spine: left on a left page, right on a right page. Center
  // boxes are written only when a center slot is used, so the default output is unchanged.
  const lines = ["top", "bottom"] as const;
  const centred = lines.filter((line) => running[line].center !== "none");
  const page = (side: "left" | "right") => {
    const [leftSlot, rightSlot] =
      side === "left" ? (["outer", "inner"] as const) : (["inner", "outer"] as const);
    const boxes = lines.flatMap((line) => [
      `@${line}-left { ${slot(running[line][leftSlot], line)} }`,
      `@${line}-right { ${slot(running[line][rightSlot], line)} }`,
    ]);
    for (const line of centred)
      boxes.push(`@${line}-center { ${slot(running[line].center, line)} }`);
    return `@page :${side} { ${boxes.join(" ")} }`;
  };
  const noMargins = [
    ...lines.flatMap((line) => [`@${line}-left { ${none} }`, `@${line}-right { ${none} }`]),
    ...centred.map((line) => `@${line}-center { ${none} }`),
  ].join(" ");
  const factor = config.font.size.factor;
  const sizes = factor === 1 ? [] : carried.map((css) => scaleFontSizes(css, factor));
  return [
    ...sizes,
    `@page { @bottom-center { ${none} } }`,
    page("left"),
    page("right"),
    `@page :blank { ${noMargins} }`,
    `@page front { ${noMargins} }`,
    `@page cover { ${noMargins} }`,
    "#ch01 { counter-reset: page 1; }",
    `.toc-page li a::after { content: target-counter(attr(href url), page${style}); }`,
    ...pageCss(config),
    "",
  ].join("\n");
}

const mm = (value: number) => `${Number(value.toFixed(3))}mm`;
const pt = (value: number) => `${Number(value.toFixed(3))}pt`;

/**
 * Font size preset (spec 006, research R-02): every `font-size: <n>pt` of a carried stylesheet
 * re-declared at `n × factor` under the same selector (and `@page` margin box), so no absolute
 * size can be missed; `em` sizes and unitless line heights follow the scaled root size.
 */
export function scaleFontSizes(css: string, factor: number): string {
  const rules: string[] = [];
  const stack: string[] = [];
  let buffer = "";
  const declaration = () => {
    const match = /^\s*font-size:\s*([\d.]+)pt\s*$/.exec(buffer);
    if (match && stack.length) {
      const inner = `font-size: ${pt(Number(match[1]) * factor)};`;
      rules.push(stack.reduceRight((body, selector) => `${selector} { ${body} }`, inner));
    }
    buffer = "";
  };
  for (const char of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (char === "{") {
      stack.push(buffer.trim().replace(/\s+/g, " "));
      buffer = "";
    } else if (char === "}") {
      declaration();
      stack.pop();
    } else if (char === ";") {
      declaration();
    } else {
      buffer += char;
    }
  }
  return rules.join("\n");
}

/**
 * Page size preset (spec 006, research R-01): the page, proportional margins, the full-bleed
 * cover and the fixed vertical offsets of print.css scaled to the page height. Nothing for the
 * default 170 × 240 mm page, whose rules are print.css's own.
 */
function pageCss(config: BookConfig): string[] {
  if (config.page.id === "default") return [];
  const { width, height } = config.page;
  const m = pageLayout(config.page);
  const v = (value: number) => mm(value * m.sy);
  return [
    `@page { size: ${mm(width)} ${mm(height)}; margin: ${mm(m.top)} ${mm(m.outside)} ${mm(m.bottom)} ${mm(m.outside)}; }`,
    `@page :left { margin-left: ${mm(m.outside)}; margin-right: ${mm(m.inside)}; }`,
    `@page :right { margin-left: ${mm(m.inside)}; margin-right: ${mm(m.outside)}; }`,
    `.cover-page, .cover-page img { width: ${mm(width)}; height: ${mm(height)}; }`,
    `.title-page { padding-top: ${v(60)}; }`,
    `.title-page .book-subtitle { margin-bottom: ${v(20)}; }`,
    `.title-page .book-publisher { margin-top: ${v(50)}; }`,
    `.copyright-page { padding-top: ${v(120)}; }`,
    `.chapter-head { padding-top: ${v(34)}; }`,
    `.end-page { padding-top: ${v(80)}; }`,
    `.end-image-page img { max-height: ${v(165)}; }`,
  ];
}

/** The PDF stylesheets in cascade order (contracts/pdf-output.md), with the set's fonts. */
export function printStylesheets(set: FontSet, config: BookConfig, printed: boolean): Stylesheet[] {
  const carried = ["common.css", "print.css", ...(printed ? ["printed.css"] : [])].map((name) => ({
    name,
    css: substituteFonts(read(`css/${name}`), set),
  }));
  return [
    ...carried,
    { name: "paged.css", css: read("css/paged.css") },
    {
      name: "book.css",
      css: bookCss(
        config,
        carried.map((sheet) => sheet.css),
      ),
    },
  ];
}
