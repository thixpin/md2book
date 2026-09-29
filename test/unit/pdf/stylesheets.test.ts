import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadManifest } from "../../../src/fonts/manifest.ts";
import { printStylesheets } from "../../../src/pdf/stylesheets.ts";
import { bookMm } from "../../helpers/fixture-config.ts";
import { FIXTURE_MANIFEST } from "../../helpers/fonts.ts";

const asset = (path: string) =>
  readFileSync(new URL(`../../../assets/${path}`, import.meta.url), "utf8");
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
const ADDITION = "/* md2book addition";

/** The carried part (before the first md2book addition) and the additions without comments. */
function split(css: string): { carried: string; added: string } {
  const at = css.indexOf(ADDITION);
  const added = at === -1 ? "" : css.slice(at).replace(/\/\*[\s\S]*?\*\//g, "");
  return { carried: at === -1 ? css : css.slice(0, at), added: added.replace(/\s+/g, " ").trim() };
}

async function sheets(printed: boolean, patch: Record<string, unknown> = {}) {
  const { sets } = await loadManifest(FIXTURE_MANIFEST);
  const config = { ...(await bookMm()), ...patch };
  return printStylesheets(sets["my-sans"], config, printed);
}

describe("printStylesheets", () => {
  it("returns common, print, paged and book stylesheets in cascade order", async () => {
    expect((await sheets(false)).map((s) => s.name)).toEqual([
      "common.css",
      "print.css",
      "paged.css",
      "book.css",
    ]);
    expect((await sheets(true)).map((s) => s.name)).toEqual([
      "common.css",
      "print.css",
      "printed.css",
      "paged.css",
      "book.css",
    ]);
  });

  it("carries print.css byte-for-byte, then only the recorded md2book additions", () => {
    const { carried, added } = split(asset("css/print.css"));
    expect(sha256(carried.replace(/\n+$/, "\n"))).toBe(
      "ba066984454101e17332978e7894e47dab737553d4ad3e17ebc436e6ca6b857d",
    );
    expect(added).toBe(
      "pre { line-height: 1.7; } h3, h4, h5, h6 { page-break-after: avoid; break-after: avoid; } " +
        ".toc-page li:not(.toc-part) { line-height: 2; margin-bottom: 1.2mm; }",
    );
  });

  it("carries printed.css byte-for-byte, then only the terminal window-control icons", () => {
    const { carried, added } = split(asset("css/printed.css"));
    expect(sha256(carried.replace(/\n+$/, "\n"))).toBe(
      "91828a7314c79987b52479709650f2e6d72f69c1f76be231ffb6991889b0d4b2",
    );
    // Close (×), minimise (−) and zoom (+), dark on a grey dot, like the macOS window controls;
    // each icon is a centred vector image.
    const icon = (path: string) =>
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E" +
      `%3Cpath d='${path}' stroke='%232b2b2b' stroke-width='1.3' stroke-linecap='round' fill='none'/%3E%3C/svg%3E")`;
    expect(added).toBe(
      ".terminal-dot, .terminal-dot + .terminal-dot, .terminal-dot + .terminal-dot + .terminal-dot { " +
        "width: 10px; height: 10px; background-color: #d4d4d4; border-color: #6e6e6e; " +
        "background-position: center; background-repeat: no-repeat; background-size: 100% 100%; } " +
        `.terminal-bar .terminal-dot:nth-child(1) { background-image: ${icon("M3.2 3.2L6.8 6.8M6.8 3.2L3.2 6.8")}; } ` +
        `.terminal-bar .terminal-dot:nth-child(2) { background-image: ${icon("M2.8 5H7.2")}; } ` +
        `.terminal-bar .terminal-dot:nth-child(3) { background-image: ${icon("M2.8 5H7.2M5 2.8V7.2")}; }`,
    );
  });

  it("serves common.css and print.css unchanged for my-sans", async () => {
    const [common, print] = await sheets(false);
    expect(common!.css).toBe(asset("css/common.css"));
    expect(print!.css).toBe(asset("css/print.css"));
  });

  it("points print.css at another set's files and families", async () => {
    const { sets } = await loadManifest(FIXTURE_MANIFEST);
    const print = printStylesheets(sets["en-serif"], await bookMm(), false)[1]!.css;
    expect(print).not.toContain("NotoSansMyanmar-");
    expect(print).not.toContain('"Noto Sans Myanmar"');
    expect(print).toContain(`url("../fonts/${sets["en-serif"].faces[0]!.file}")`);
    expect(print).toContain('"Noto Serif"');
  });

  it("works around Paged.js in paged.css", async () => {
    const paged = (await sheets(false)).find((s) => s.name === "paged.css")!.css;
    const rules = paged
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .trim();
    expect(rules).toBe(
      ".pagedjs_page.chapter-first .pagedjs_margin { visibility: hidden; } " +
        ".pagedjs_page.pagedjs_blank_page .pagedjs_margin { visibility: hidden; } " +
        "[data-align-last-split-element='justify']:not(p, li) { text-align-last: auto; }",
    );
  });

  it("runs author and chapter title in the header, page number and book title in the footer", async () => {
    const book = (
      await sheets(false, { title: 'Say "hi" \\ now\nplease', author: "A. Author" })
    ).at(-1)!;
    expect(book.name).toBe("book.css");
    const css = book.css;
    const head = (content: string) =>
      `content: ${content}; font-size: 9pt; color: #777; vertical-align: bottom; padding-bottom: 7.5mm;`;
    const foot = (content: string) =>
      `content: ${content}; font-size: 9pt; color: #777; vertical-align: top; padding-top: 4mm;`;
    const title = '"Say \\"hi\\" \\\\ now\\a please"';
    // Outside: left edge of a left page, right edge of a right page.
    expect(css).toContain(
      `@page :left { @top-left { ${head('"A. Author"')} } @top-right { ${head("string(chaptertitle)")} } ` +
        `@bottom-left { ${foot("var(--md2book-folio)")} } @bottom-right { ${foot(title)} } }`,
    );
    expect(css).toContain(
      `@page :right { @top-left { ${head("string(chaptertitle)")} } @top-right { ${head('"A. Author"')} } ` +
        `@bottom-left { ${foot(title)} } @bottom-right { ${foot("var(--md2book-folio)")} } }`,
    );
    expect(css).toContain("@page { @bottom-center { content: none; } }");
    const none =
      "@top-left { content: none; } @top-right { content: none; } @bottom-left { content: none; } @bottom-right { content: none; }";
    for (const page of [":blank", "front", "cover"])
      expect(css).toContain(`@page ${page} { ${none} }`);
  });

  it("numbers pages from chapter one, in the book's digits", async () => {
    const mm = (await sheets(false)).at(-1)!.css;
    expect(mm).toContain("#ch01 { counter-reset: page 1; }");
    expect(mm).toContain(
      ".toc-page li a::after { content: target-counter(attr(href url), page, myanmar); }",
    );
    const strings = { ...(await bookMm()).strings, chapter_digits: "ascii" as const };
    const en = (await sheets(false, { strings })).at(-1)!.css;
    expect(en).toContain(
      ".toc-page li a::after { content: target-counter(attr(href url), page); }",
    );
  });

  it("drops the header line, keeping the footer, when running_headers is false", async () => {
    const css = (await sheets(false, { running_headers: false })).at(-1)!.css;
    expect(css).toContain(
      "@page :left { @top-left { content: none; } @top-right { content: none; } @bottom-left { content: var(--md2book-folio);",
    );
    expect(css).toContain(
      '@page :right { @top-left { content: none; } @top-right { content: none; } @bottom-left { content: "',
    );
  });
});
