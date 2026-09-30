// Links between chapter files, as books written for GitHub have them, in each edition.
import { appendFileSync, cpSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadBook } from "../../src/book/load.ts";
import { loadConfig, type BookConfig } from "../../src/config/load.ts";
import { epubDocuments } from "../../src/epub/documents.ts";
import { printDocument } from "../../src/pdf/document.ts";
import { buildWeb } from "../../src/web/build.ts";
import { bookEn } from "../helpers/fixture-config.ts";
import { FIXTURE_MANIFEST } from "../helpers/fonts.ts";
import { fixture, tempDir } from "../helpers/temp.ts";
import { fixtureFontCache } from "../helpers/web.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

const NAV = "\n[Next](chapter-02.md) · [Draft](chapter-03.md) · [Home](../README.md)\n";

/** The English fixture book with GitHub-style navigation at the end of chapter 1. */
async function book(): Promise<BookConfig> {
  const dir = tempDir();
  cpSync(fixture("book-en"), dir, { recursive: true });
  appendFileSync(join(dir, "chapters", "chapter-01.md"), NAV);
  const { config } = await loadConfig(join(dir, "book.json"));
  // The fixture includes code from a folder beside the book, which the copy does not have.
  return { ...config, code_root: (await bookEn()).code_root };
}

describe("links between chapter files", { timeout: 60_000 }, () => {
  it("link the EPUB's chapter documents and its contents", async () => {
    const docs = epubDocuments(await loadBook(await book()), "cover.png", undefined);
    const ch01 = docs.find((doc) => doc.href === "text/ch01.xhtml")!.content;
    expect(ch01).toContain('<a href="ch02.xhtml">Next</a>');
    expect(ch01).toContain('<a href="ch03.xhtml">Draft</a>');
    expect(ch01).toContain('<a href="nav.xhtml">Home</a>');
    expect(ch01).not.toContain("md2book:");
  });

  it("link the PDF's chapters and its contents page", async () => {
    const html = printDocument(await loadBook(await book()), { printed: false, stylesheets: [] });
    expect(html).toContain('<a href="#ch02">Next</a>');
    expect(html).toContain('<a href="#ch03">Draft</a>');
    expect(html).toContain('<a href="#contents">Home</a>');
    expect(html).toContain('<section class="front toc-page" id="contents">');
    expect(html).not.toContain("md2book:");
  });

  it("link the web edition's chapter pages, and never an unpublished chapter", async () => {
    const config = await book();
    const out = join(tempDir(), "book");
    const fontsDir = await fixtureFontCache(config);
    const { dir } = await buildWeb(
      { ...config, web_url: "https://owner.github.io/my-book/" },
      { out, fontsDir, manifestPath: FIXTURE_MANIFEST },
    );
    const index = readFileSync(join(dir, "index.html"), "utf8");
    expect(index).toContain('<a href="/my-book/chapters/ch02.html">Next</a>');
    expect(index).toContain("· Draft ·");
    expect(index).toContain('<a href="/my-book/">Home</a>');
    expect(index).not.toContain("chapter-03");
    expect(index).not.toContain("md2book:");
  });
});
