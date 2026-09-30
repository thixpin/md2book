import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadChapters } from "../../../src/manuscript/chapters.ts";
import { BookError } from "../../../src/errors.ts";
import { testConfig } from "../../helpers/config.ts";
import { bookMm } from "../../helpers/fixture-config.ts";
import { fixture, tempDir } from "../../helpers/temp.ts";

const load = (files: Record<string, string>, language: "my" | "en" = "my") => {
  const dir = tempDir(files);
  return loadChapters(testConfig(dir, { language }));
};

async function loadError(files: Record<string, string>, language: "my" | "en" = "my") {
  const error: unknown = await load(files, language).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(BookError);
  return error as BookError;
}

describe("loadChapters", () => {
  it("orders files by code point, not locale, and numbers by position", async () => {
    const chapters = await load({
      "chapters/chapter-a.md": "# အခန်း (၂) - Lower\n",
      "chapters/chapter-Z.md": "# အခန်း (၁) - Upper\n",
    });
    // Code-point order puts "Z" (U+005A) before "a" (U+0061); locale order would not.
    expect(chapters.map((c) => c.title)).toEqual(["Upper", "Lower"]);
    expect(chapters.map((c) => c.slug)).toEqual(["ch01", "ch02"]);
    expect(chapters.map((c) => c.index)).toEqual([1, 2]);
  });

  it("parses a Myanmar heading", async () => {
    const [ch] = await load({ "chapters/chapter-01.md": "# အခန်း (၁) - Title\n\nBody.\n" });
    expect(ch).toMatchObject({
      label: "အခန်း (၁)",
      title: "Title",
      fullTitle: "အခန်း (၁) - Title",
      number: 1,
    });
  });

  it("parses a heading with an em dash and writes the full title with the book's hyphen", async () => {
    const [ch] = await load({ "chapters/chapter-01.md": "# အခန်း (၁) — Title — More\n\nBody.\n" });
    expect(ch).toMatchObject({
      label: "အခန်း (၁)",
      title: "Title — More",
      fullTitle: "အခန်း (၁) - Title — More",
    });
  });

  it("reads ASCII digits in a Myanmar label", async () => {
    const [ch] = await load({ "chapters/chapter-01.md": "# အခန်း (7) - Seven\n" });
    expect(ch?.number).toBe(7);
  });

  it("parses an English heading", async () => {
    const [ch] = await load({ "chapters/chapter-01.md": "# Chapter 3 - Title\n" }, "en");
    expect(ch).toMatchObject({ label: "Chapter 3", number: 3, slug: "ch01" });
  });

  it("skips leading blank lines before the heading", async () => {
    const [ch] = await load({ "chapters/chapter-01.md": "\n  \n# အခန်း (၁) - Title\nBody\n" });
    expect(ch?.title).toBe("Title");
  });

  it("stops on a bad first line, naming the file and the line", async () => {
    const error = await loadError({ "chapters/chapter-01.md": "Intro\n# အခန်း (၁) - T\n" });
    expect(error.subject).toMatch(/chapter-01\.md$/);
    expect(error.reason).toBe("first line is not a chapter heading: Intro");
  });

  it("stops on the other language's heading shape", async () => {
    await loadError({ "chapters/chapter-01.md": "# Chapter (3) - T\n" }, "en");
    await loadError({ "chapters/chapter-01.md": "# အခန်း 1 - T\n" }, "my");
  });

  it("stops when no file matches the glob, naming the glob", async () => {
    const dir = tempDir({ "other.md": "x" });
    const config = testConfig(dir);
    const error: unknown = await loadChapters(config).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BookError);
    expect((error as BookError).subject).toBe(config.chapter_glob);
    expect((error as BookError).reason).toBe("no chapter files match");
  });

  it("normalises CRLF and NFC in memory", async () => {
    const [ch] = await loadChapters(await bookMm());
    expect(ch?.bodyMd).not.toContain("\r");
    expect(ch?.bodyMd).toContain("ဦ");
    expect(ch?.bodyMd).not.toContain("ဦ");
  });

  it("trims blank lines around the body and ends with one newline", async () => {
    const [ch] = await load({ "chapters/chapter-01.md": "# အခန်း (၁) - T\n\n\nBody\n  \n\n\n" });
    expect(ch?.bodyMd).toBe("Body\n  \n");
  });

  it("lists ## sections in order", async () => {
    const [ch] = await load({
      "chapters/chapter-01.md": "# အခန်း (၁) - T\n\n## One\n\ntext\n\n### Sub\n\n## Two  \n",
    });
    expect(ch?.sections).toEqual(["One", "Two"]);
  });

  it("gives an empty body and no sections for a heading-only chapter", async () => {
    const [ch] = await load({ "chapters/chapter-01.md": "# အခန်း (၁) - T" });
    expect(ch?.bodyMd).toBe("\n");
    expect(ch?.sections).toEqual([]);
  });

  it("records the source path", async () => {
    const dir = tempDir({ "chapters/chapter-01.md": "# အခန်း (၁) - T\n" });
    const [ch] = await loadChapters(testConfig(dir));
    expect(ch?.sourcePath).toBe(join(dir, "chapters", "chapter-01.md"));
  });

  it("loads the Burmese fixture book", async () => {
    const chapters = await loadChapters(testConfig(fixture("book-mm")));
    expect(chapters.map((c) => [c.label, c.number])).toEqual([
      ["အခန်း (၁)", 1],
      ["အခန်း (2)", 2],
    ]);
  });
});
