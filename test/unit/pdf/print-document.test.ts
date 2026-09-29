import { describe, expect, it } from "vitest";
import { loadBook } from "../../../src/book/load.ts";
import { frontMatterHtml } from "../../../src/epub/front-matter.ts";
import { tocListHtml } from "../../../src/manuscript/toc.ts";
import { chapterHeadHtml } from "../../../src/markdown/chapter-head.ts";
import {
  addSyllableBreaks,
  fitPreBlocks,
  isolateCodeNewlines,
  printDocument,
} from "../../../src/pdf/document.ts";
import { bookEn, bookMm } from "../../helpers/fixture-config.ts";

const SHEETS = ["common.css", "print.css", "paged.css", "book.css"];

describe("printDocument", () => {
  it("follows the reference build_pdf document, with Paged.js set up to start manually", async () => {
    const book = await loadBook({ ...(await bookMm()), recto_chapter_start: true });
    const { titlePage, copyrightPage } = frontMatterHtml(book.config);
    const [ch1, ch2] = book.chapters;
    const expected = [
      '<!DOCTYPE html><html lang="my"><head><meta charset="utf-8"/>',
      "<title>မြန်မာ စမ်းသပ်စာအုပ်</title>" +
        SHEETS.map((name) => `<link rel="stylesheet" href="/css/${name}"/>`).join("") +
        "<script>window.PagedConfig = { auto: false };</script>" +
        '<script src="/pagedjs/paged.polyfill.js"></script>' +
        '<script src="/pagedjs/handler.js"></script></head>',
      '<body data-title="မြန်မာ စမ်းသပ်စာအုပ်" data-folio-digits="myanmar">',
      '<div class="cover-page"><img src="/book/cover.png" alt="Cover"/></div>',
      `<section class="front">${titlePage}</section>`,
      `<section class="front">${copyrightPage}</section>`,
      `<section class="front toc-page"><h1>${book.config.strings.contents_heading}</h1>${tocListHtml(book.parts, book.chapters, "#{slug}")}</section>`,
      `<section class="chapter group-a recto" id="ch01">${chapterHeadHtml(ch1!)}${isolateCodeNewlines(fitPreBlocks(addSyllableBreaks(ch1!.html!)))}</section>`,
      `<section class="chapter group-b recto" id="ch02">${chapterHeadHtml(ch2!)}${isolateCodeNewlines(fitPreBlocks(addSyllableBreaks(ch2!.html!)))}<div class="md2book-end"></div></section>`,
      "</body></html>",
    ].join("\n");
    expect(printDocument(book, { printed: false, stylesheets: SHEETS })).toBe(expected);
  });

  it("omits the recto class without recto starts, and the cover in the printed edition", async () => {
    const book = await loadBook(await bookMm());
    const html = printDocument(book, { printed: true, stylesheets: SHEETS });
    expect(html).not.toContain("cover-page");
    expect(html).toContain('<section class="chapter group-a" id="ch01">');
    expect(html).toContain('<section class="chapter group-b" id="ch02">');
  });

  it("ends with the end image page when it is gated in", async () => {
    const book = await loadBook(await bookMm());
    const html = printDocument(book, {
      printed: false,
      stylesheets: SHEETS,
      endImage: "/any/where/end.PNG",
    });
    expect(
      html.endsWith(
        '\n<section class="end-image-page"><img src="/book/end.png" alt=""/><div class="md2book-end"></div></section>\n</body></html>',
      ),
    ).toBe(true);
  });

  it("uses the book's language", async () => {
    const html = printDocument(await loadBook(await bookEn()), { printed: true, stylesheets: [] });
    expect(html).toContain('<html lang="en">');
  });

  it("escapes the title", async () => {
    const config = { ...(await bookMm()), title: 'A & B "C"' };
    const html = printDocument(await loadBook(config), { printed: true, stylesheets: [] });
    expect(html).toContain("<title>A &amp; B &quot;C&quot;</title>");
    expect(html).toContain(
      '<body data-title="A &amp; B &quot;C&quot;" data-folio-digits="myanmar">',
    );
  });
});

describe("isolateCodeNewlines", () => {
  it("gives every newline inside <pre> its own node, like the reference highlighter", () => {
    expect(
      isolateCodeNewlines(
        '<p>a\nb</p><pre class="code"><code><span class="k">f</span>(\n  x,\n)\n</code></pre>',
      ),
    ).toBe(
      '<p>a\nb</p><pre class="code"><code><span class="k">f</span>(<span class="nl">\n</span>  x,<span class="nl">\n</span>)<span class="nl">\n</span></code></pre>',
    );
  });
});
