import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultStrings } from "../../../src/config/language.ts";
import type { Chapter } from "../../../src/manuscript/chapters.ts";
import { bookHrefs, linkContext, linksHome } from "../../../src/markdown/links.ts";
import { renderMarkdown } from "../../../src/markdown/render.ts";

const dir = "/book/chapters";
const chapter = (file: string, slug: string) =>
  ({ sourcePath: join(dir, file), slug }) as unknown as Chapter;
const one = chapter("01-intro.md", "ch01");
const two = chapter("02-setup.md", "ch02");
const strings = defaultStrings("en", "sans");
const render = (md: string) => renderMarkdown(md, strings, linkContext(one, [one, two]));

describe("links between manuscript files", () => {
  it("points a link to a chapter file at that chapter", () => {
    expect(render("[Next](02-setup.md)")).toBe('<p><a href="md2book:chapter:ch02">Next</a></p>\n');
    expect(render("[Next](./02-setup.md#install)")).toContain('href="md2book:chapter:ch02"');
    expect(render("[Here](01-intro.md)")).toContain('href="md2book:chapter:ch01"');
  });

  it("points README.md at the book's start", () => {
    expect(render("[🏠 Contents](../README.md)")).toBe(
      '<p><a href="md2book:home">🏠 Contents</a></p>\n',
    );
  });

  it("keeps only the text of a link to another Markdown file, like an unpublished chapter", () => {
    expect(render("[← Draft](03-draft.md) · [Next](02-setup.md)")).toBe(
      '<p>← Draft · <a href="md2book:chapter:ch02">Next</a></p>\n',
    );
  });

  it("leaves web links, anchors, root paths and other files as written", () => {
    for (const href of [
      "https://example.com/a.md",
      "#section",
      "/docs/a.md",
      "notes.pdf",
      "mailto:a@b.c",
    ]) {
      expect(render(`[x](${href})`)).toContain(`href="${href}"`);
    }
  });

  it("leaves every link as written without a chapter set", () => {
    expect(renderMarkdown("[Next](02-setup.md)", strings)).toContain('href="02-setup.md"');
  });
});

describe("bookHrefs", () => {
  it("swaps the markers for an edition's URLs", () => {
    const html = render("[Next](02-setup.md) [Home](../README.md)");
    expect(linksHome(html)).toBe(true);
    expect(bookHrefs(html, (slug) => `/chapters/${slug}.html`, "/")).toBe(
      '<p><a href="/chapters/ch02.html">Next</a> <a href="/">Home</a></p>\n',
    );
    expect(linksHome(render("[Next](02-setup.md)"))).toBe(false);
  });
});
