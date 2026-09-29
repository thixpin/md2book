import { XMLValidator } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { loadBook } from "../../../src/book/load.ts";
import { epubDocuments, xhtmlDoc } from "../../../src/epub/documents.ts";
import { frontMatterHtml } from "../../../src/epub/front-matter.ts";
import { testConfig } from "../../helpers/config.ts";
import { bookMm } from "../../helpers/fixture-config.ts";
import { tempDir } from "../../helpers/temp.ts";

describe("xhtmlDoc", () => {
  it("wraps a body exactly like the reference", () => {
    const config = testConfig(tempDir(), { language: "my" });
    expect(xhtmlDoc(config, "A & B", "<p>x</p>", "cover-body", "cover")).toBe(
      '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" ' +
        'xml:lang="my" lang="my">\n' +
        '<head><meta charset="utf-8"/><title>A &amp; B</title>' +
        '<link rel="stylesheet" type="text/css" href="../css/common.css"/>' +
        '<link rel="stylesheet" type="text/css" href="../css/epub.css"/></head>\n' +
        '<body class="cover-body" epub:type="cover">\n<p>x</p>\n</body>\n</html>\n',
    );
  });
});

describe("front matter", () => {
  it("writes optional fields only when set and uses the series strings", () => {
    const base = testConfig(tempDir(), { title: "T", author: "A", year: "2026" });
    const bare = frontMatterHtml(base);
    expect(bare.titlePage).toBe(
      '<div class="title-page"><p class="book-title">T</p><p class="book-author">A</p></div>',
    );
    expect(bare.copyrightPage).toBe(
      '<div class="copyright-page"><p>T</p><p>Copyright &#169; 2026 A</p>' +
        `<p>${base.strings.licence_text}</p><p>Typeface: Noto Sans Myanmar</p></div>`,
    );
    const full = frontMatterHtml({ ...base, subtitle: "S", publisher: "P", isbn: "978" });
    expect(full.titlePage).toContain('<p class="book-subtitle">S</p>');
    expect(full.titlePage).toContain('<p class="book-publisher">P</p>');
    expect(full.copyrightPage).toContain("<p>Publisher: P</p><p>ISBN: 978</p>");
  });
});

describe("epubDocuments", () => {
  it("orders cover, title, copyright, nav, chapters and end image", async () => {
    const book = await loadBook(await bookMm());
    const docs = epubDocuments(book, "cover.png", "end.png");
    expect(docs.map((d) => d.href)).toEqual([
      "text/cover.xhtml",
      "text/title.xhtml",
      "text/copyright.xhtml",
      "text/nav.xhtml",
      "text/ch01.xhtml",
      "text/ch02.xhtml",
      "text/end.xhtml",
    ]);
    for (const doc of docs) expect(XMLValidator.validate(doc.content), doc.href).toBe(true);
    const nav = docs.find((d) => d.id === "nav")!.content;
    expect(nav).toContain('<nav epub:type="toc" id="toc"><h1>မာတိကာ</h1><ol class="toc-parts">');
    expect(nav).toContain('<li><a epub:type="bodymatter" href="ch01.xhtml">Start</a></li>');
    const ch = docs.find((d) => d.id === "ch01")!.content;
    expect(ch).toContain('<body epub:type="bodymatter">\n<section epub:type="chapter" id="ch01">');
    expect(ch).toContain('<header class="chapter-head"><p class="chapter-number">');
    expect(docs.find((d) => d.id === "cover")!.content).toContain(
      '<div class="cover"><img src="../images/cover.png" alt="Cover"/></div>',
    );
    expect(docs.find((d) => d.id === "endimage")!.content).toContain(
      '<body class="end-image-body" epub:type="backmatter">',
    );
  });

  it("leaves the end image out when it is not enabled", async () => {
    const docs = epubDocuments(await loadBook(await bookMm()), "cover.png", undefined);
    expect(docs.map((d) => d.id)).not.toContain("endimage");
  });
});
