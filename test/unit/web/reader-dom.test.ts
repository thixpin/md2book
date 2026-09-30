import { describe, expect, it } from "vitest";
import type { BookConfig } from "../../../src/config/load.ts";
import { loadPublishedChapters } from "../../../src/manuscript/chapters.ts";
import { loadParts } from "../../../src/manuscript/parts.ts";
import { expandSnippets } from "../../../src/manuscript/snippets.ts";
import { renderChapter } from "../../../src/markdown/render.ts";
import { computeBookKey, readerHtml, readerToolbar } from "../../../src/web/reader-dom.ts";
import { bookEn, bookMm } from "../../helpers/fixture-config.ts";
import { attr, elements, find } from "../../helpers/html.ts";

async function webBook(config: BookConfig) {
  const chapters = await loadPublishedChapters(config);
  const parts = await loadParts(config, chapters);
  for (const ch of chapters) {
    expandSnippets(ch, config.code_root);
    renderChapter(ch, config.strings);
  }
  const facts = {
    ratio: 0.70833,
    edge: [12.4, 34.5, 56.6] as [number, number, number],
    width: 850,
    height: 1200,
  };
  return {
    config,
    chapters,
    parts,
    bookKey: computeBookKey(config, "/dist/book-mm", chapters),
    coverName: "cover.png",
    backCoverName: "back-cover.png",
    facts,
  };
}

const HOOKS = [
  "div.reader-shell[data-reader]",
  ".book[data-book]",
  "svg.book-paper[data-book-paper]",
  ".reader-window",
  "article.reader-flow",
  "section.front-page.cover-page[data-front-matter][role=img]",
  "section.front-page.endpaper-page[data-front-matter]",
  "section.front-page.contents-page[data-front-matter]",
  "section.book-chapter[data-chapter][data-title][data-short-title][data-href]",
  "section.back-matter.back-filler[data-front-matter]",
  "section.back-matter.endpaper-page.back-endpaper[data-front-matter]",
  "section.back-matter.back-cover-page[data-front-matter][role=img]",
  "span.flow-end",
  ".book-gutter",
  "span.page-number[data-page-number]",
  "span.page-head[data-page-head]",
  ".book-cover[data-book-cover]",
  ".cover-face[data-cover-front]",
  ".cover-face.cover-back",
  ".book-cover.book-back-cover[data-book-back-cover]",
  ".turn-layer[data-turn-layer]",
  ".turn-under[data-turn-under]",
  ".turn-cast[data-turn-cast]",
  ".turn-sheet[data-turn-sheet]",
  ".book-crease",
  "nav.reader-controls",
  "button.page-turn[data-page-previous]",
  "output.page-status",
  "span[data-page-indicator]",
  "span.visually-hidden[data-page-status]",
  "button.page-turn[data-page-next]",
  "div.reader-panel#reader-contents[popover]",
  "ol[data-bookmark-list]",
  "p.empty[data-bookmark-empty]",
  "div.reader-panel#reader-search[popover]",
  "input[data-search-input]",
  "p.empty[data-search-status]",
  "ol[data-search-results]",
];

function matches(el: ReturnType<typeof elements>[number], selector: string): boolean {
  const m = /^(\w+)?((?:\.[\w-]+)*)(#[\w-]+)?((?:\[[^\]]+\])*)$/.exec(selector)!;
  const [, tag, classes, id, attrs] = m;
  if (tag && el.tagName !== tag) return false;
  const have = (attr(el, "class") ?? "").split(" ");
  if (
    classes &&
    !classes
      .split(".")
      .filter(Boolean)
      .every((c) => have.includes(c))
  )
    return false;
  if (id && attr(el, "id") !== id.slice(1)) return false;
  for (const [, name, value] of attrs?.matchAll(/\[([\w-]+)(?:=([\w-]+))?\]/g) ?? []) {
    const v = attr(el, name!);
    if (v === undefined || (value !== undefined && v !== value)) return false;
  }
  return true;
}

describe("reader DOM", () => {
  it("has every reference hook", async () => {
    const html = readerHtml(await webBook(await bookMm()), "");
    for (const selector of HOOKS) {
      expect(find(html, (el) => matches(el, selector)).length, selector).toBeGreaterThan(0);
    }
  });

  it("starts loading, showing only the cover until the reader has laid out the book", async () => {
    const book = await webBook(await bookMm());
    const html = readerHtml(book, "");
    const [shell] = find(html, (el) => matches(el, "div[data-reader]"));
    expect((attr(shell!, "class") ?? "").split(" ")).toContain("is-loading");
    const [loading] = find(html, (el) => matches(el, "div.reader-loading[data-reader-loading]"));
    expect(loading).toBeDefined();
    const [img] = find(
      html,
      (el) => el.tagName === "img" && attr(el, "class") === "reader-loading-cover",
    );
    expect(attr(img!, "src")).toBe(`/${book.coverName}`);
    expect(attr(img!, "alt")).toBe("");
    expect(attr(img!, "fetchpriority")).toBe("high");
    // First in the book, before the (possibly megabytes of) book text, so it is found at once.
    expect(html.indexOf("data-reader-loading")).toBeLessThan(html.indexOf("reader-flow"));
    expect(html).toContain('<span class="visually-hidden" role="status">Loading the book…</span>');
  });

  it("gives CSS the cover's edge colour for the hardcover case", async () => {
    const [shell] = find(readerHtml(await webBook(await bookMm()), ""), (el) =>
      matches(el, "div[data-reader]"),
    );
    expect(attr(shell!, "data-cover-edge")).toBe("rgb(12 34 57)");
    expect(attr(shell!, "style")).toBe("--cover-edge: rgb(12 34 57)");
  });

  it("lays out the flow: front matter, chapters, back matter, end", async () => {
    const html = readerHtml(await webBook(await bookMm()), "");
    const flow = find(html, (el) => el.tagName === "section" || matches(el, "span.flow-end")).map(
      (el) => (attr(el, "class") ?? "").split(" ").at(-1),
    );
    expect(flow).toEqual([
      "cover-page",
      "endpaper-page",
      "contents-page",
      "book-chapter",
      "book-chapter",
      "back-filler",
      "back-endpaper",
      "back-cover-page",
      "flow-end",
    ]);
  });

  it("writes the reader data attributes like the reference", async () => {
    const book = await webBook(await bookMm());
    const [shell] = find(readerHtml(book, "ch01"), (el) => matches(el, "div[data-reader]"));
    expect(attr(shell!, "data-open-chapter")).toBe("ch01");
    expect(attr(shell!, "data-cover-src")).toBe("/cover.png");
    expect(attr(shell!, "data-back-cover-src")).toBe("/back-cover.png");
    expect(attr(shell!, "data-cover-ratio")).toBe("0.70833");
    expect(attr(shell!, "data-cover-edge")).toBe("rgb(12 34 57)");
    expect(attr(shell!, "data-book-key")).toMatch(/^devbook:book-mm:[0-9a-f]{10}$/);
    for (const name of ["data-folio-digits", "data-name-cover", "data-name-contents"]) {
      expect(attr(shell!, name)).toBeUndefined();
    }
  });

  it("uses the configured contents heading and chapter hrefs", async () => {
    const html = readerHtml(await webBook(await bookMm()), "");
    const [heading] = find(html, (el) => el.tagName === "h2");
    expect((heading!.childNodes[0] as { value: string }).value).toBe("မာတိကာ");
    const hrefs = find(html, (el) => matches(el, "section[data-href]")).map((el) =>
      attr(el, "data-href"),
    );
    expect(hrefs).toEqual(["/chapters/ch01.html", "/chapters/ch02.html"]);
  });

  it("asks an English book's reader for ASCII folios", async () => {
    const html = readerHtml(await webBook(await bookEn()), "");
    const [shell] = find(html, (el) => matches(el, "div[data-reader]"));
    expect(attr(shell!, "data-folio-digits")).toBe("ascii");
    expect(find(html, (el) => el.tagName === "h2").length).toBeGreaterThan(0);
  });

  it("changes the book key when chapter text changes", async () => {
    const book = await webBook(await bookMm());
    const before = computeBookKey(book.config, "/dist/book-mm", book.chapters);
    book.chapters[0]!.expandedMd += "x";
    expect(computeBookKey(book.config, "/dist/book-mm", book.chapters)).not.toBe(before);
  });

  it("renders the toolbar with the reference buttons", () => {
    const html = readerToolbar();
    expect(find(html, (el) => attr(el, "popovertarget") === "reader-contents")).toHaveLength(1);
    expect(find(html, (el) => attr(el, "popovertarget") === "reader-search")).toHaveLength(1);
    expect(find(html, (el) => matches(el, "button[data-bookmark-toggle]"))).toHaveLength(1);
    expect(find(html, (el) => matches(el, "button[data-fullscreen-toggle][hidden]"))).toHaveLength(
      1,
    );
  });

  it("offers a text-size control: toolbar button and panel with smaller/larger and the size", async () => {
    const toolbar = readerToolbar();
    const [button] = find(toolbar, (el) => attr(el, "popovertarget") === "reader-text");
    expect(attr(button!, "aria-label")).toBe("Text size");
    expect(find(toolbar, (el) => matches(el, "svg.icon-a-large-small"))).toHaveLength(1);
    const html = readerHtml(await webBook(await bookMm()), "");
    expect(find(html, (el) => matches(el, "div.reader-panel#reader-text[popover]"))).toHaveLength(
      1,
    );
    const [smaller] = find(html, (el) => matches(el, "button.reader-tool[data-text-smaller]"));
    const [larger] = find(html, (el) => matches(el, "button.reader-tool[data-text-larger]"));
    expect(attr(smaller!, "aria-label")).toBe("Smaller text");
    expect(attr(larger!, "aria-label")).toBe("Larger text");
    const [output] = find(html, (el) => matches(el, "output[data-text-size]"));
    expect(attr(output!, "aria-live")).toBe("polite");
  });
});
