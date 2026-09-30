import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../../src/config/load.ts";
import { BookError } from "../../../src/errors.ts";
import { PNG_1X1, fixture, tempDir } from "../../helpers/temp.ts";

const base = {
  title: "T",
  author: "A",
  year: "2026",
  identifier: "urn:uuid:x",
  output_name: "t",
  cover: "cover.png",
  chapter_glob: "chapters/chapter-*.md",
};

function book(config: Record<string, unknown>, extra: Record<string, string | Uint8Array> = {}) {
  const dir = tempDir({ "book.json": JSON.stringify(config), "cover.png": PNG_1X1, ...extra });
  return join(dir, "book.json");
}

async function loadError(path: string): Promise<BookError> {
  const error: unknown = await loadConfig(path).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(BookError);
  return error as BookError;
}

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

describe("loadConfig", () => {
  it("loads a valid config and resolves paths relative to the config file", async () => {
    const path = fixture("book-mm", "book.json");
    const { config } = await loadConfig(path);
    expect(config.title).toBe("မြန်မာ စမ်းသပ်စာအုပ်");
    expect(config.cover).toBe(fixture("book-mm", "cover", "cover.png"));
    expect(config.chapter_glob).toBe(fixture("book-mm", "chapters", "chapter-*.md"));
    expect(config.code_root).toBe(fixture("code"));
    expect(config.configPath).toBe(path);
  });

  it("stops when cover is empty, naming the config file and the key", async () => {
    const path = book({ ...base, cover: "" });
    const error = await loadError(path);
    expect(error.subject).toBe(path);
    expect(error.reason).toContain("cover");
  });

  it("stops when the cover file is missing, naming the config file and the cover path", async () => {
    const path = book({ ...base, cover: "missing.png" });
    const error = await loadError(path);
    expect(error.subject).toBe(path);
    expect(error.reason).toContain(join(path, "..", "missing.png"));
  });

  it("stops on a wrong type, naming the key", async () => {
    const error = await loadError(book({ ...base, running_headers: "yes" }));
    expect(error.reason).toMatch(/^running_headers: /);
  });

  it("stops on a missing required key, naming it, before any other check", async () => {
    const rest = Object.fromEntries(Object.entries(base).filter(([key]) => key !== "title"));
    const error = await loadError(book({ ...rest, cover: "missing.png" }));
    expect(error.reason).toMatch(/^title: /);
  });

  it("warns about unknown keys at any depth and continues", async () => {
    const { warnings } = await loadConfig(
      book({ ...base, colour: "red", strings: { chapter_lable: "X", page_names: { index: "I" } } }),
    );
    expect(warnings).toEqual([
      "unknown key: colour",
      "unknown key: strings.chapter_lable",
      "unknown key: strings.page_names.index",
    ]);
  });

  it("treats empty publisher and isbn as absent", async () => {
    const { config } = await loadConfig(book({ ...base, publisher: "", isbn: "" }));
    expect(config.publisher).toBeUndefined();
    expect(config.isbn).toBeUndefined();
  });

  it("collects values containing PLACEHOLDER", async () => {
    const { placeholders } = await loadConfig(
      book({ ...base, isbn: "PLACEHOLDER-ISBN", strings: { typeface_line: "PLACEHOLDER" } }),
    );
    expect(placeholders).toEqual([
      { key: "isbn", value: "PLACEHOLDER-ISBN" },
      { key: "strings.typeface_line", value: "PLACEHOLDER" },
    ]);
  });

  it("defaults language to my", async () => {
    const { config } = await loadConfig(book(base));
    expect(config.language).toBe("my");
    expect(config.strings.chapter_label).toBe("အခန်း");
  });

  it("stops on an unsupported language, listing valid values", async () => {
    const error = await loadError(book({ ...base, language: "fr" }));
    expect(error.reason).toBe("language: must be one of my, en");
  });

  it("stops on an unsupported font set, listing valid sets", async () => {
    const error = await loadError(book({ ...base, font_set: "mono" }));
    expect(error.reason).toBe("font_set: must be one of sans, serif");
  });

  it("lets explicit strings win and keeps them when the language changes", async () => {
    const strings = { chapter_label: "Lesson" };
    const en = await loadConfig(book({ ...base, language: "en", strings }));
    const my = await loadConfig(book({ ...base, language: "my", strings }));
    expect(en.config.strings.chapter_label).toBe("Lesson");
    expect(my.config.strings.chapter_label).toBe("Lesson");
    expect(en.config.strings.contents_heading).toBe("Contents");
    expect(my.config.strings.contents_heading).toBe("မာတိကာ");
  });

  it("merges nested strings over the defaults", async () => {
    const { config } = await loadConfig(
      book({ ...base, strings: { callout_titles: { try: "Do it" } } }),
    );
    expect(config.strings.callout_titles).toEqual({
      note: "Note",
      warning: "Warning",
      try: "Do it",
    });
  });

  it("defaults the page size, font family and font size (spec 006)", async () => {
    const { config } = await loadConfig(book(base));
    expect(config.page).toMatchObject({ id: "default", width: 170, height: 240 });
    expect(config.font).toMatchObject({ family: "noto-sans-myanmar", setId: "my-sans" });
    expect(config.font.size).toMatchObject({ id: "m", factor: 1 });
    const en = await loadConfig(book({ ...base, language: "en" }));
    expect(en.config.font).toMatchObject({ family: "noto-sans", setId: "en-sans" });
  });

  it("reads page.size, font.family and font.size", async () => {
    const { config } = await loadConfig(
      book({ ...base, page: { size: "a5" }, font: { family: "noto-serif-myanmar", size: "xl" } }),
    );
    expect(config.page).toMatchObject({ id: "a5", width: 148, height: 210, suffix: "148x210" });
    expect(config.font).toMatchObject({ family: "noto-serif-myanmar", setId: "my-serif" });
    expect(config.font.size).toMatchObject({ id: "xl", factor: 1.2 });
    expect(config.strings.typeface_line).toBe("Typeface: Noto Serif Myanmar");
  });

  it("maps the legacy font_set to a family", async () => {
    const { config } = await loadConfig(book({ ...base, language: "en", font_set: "serif" }));
    expect(config.font).toMatchObject({ family: "noto-serif", setId: "en-serif" });
  });

  it.each([
    [{ page: { size: "a6" } }, "page.size: must be one of default, a5, b5, a4, letter"],
    [{ font: { size: "12pt" } }, "font.size: must be one of xs, s, m, l, xl"],
  ])("stops on a preset outside the list: %j", async (extra, reason) => {
    const error = await loadError(book({ ...base, ...extra }));
    expect(error.reason).toBe(reason);
  });

  it("stops on an unknown font family, listing the families", async () => {
    const error = await loadError(book({ ...base, font: { family: "comic-sans" } }));
    expect(error.reason).toMatch(/^font\.family: must be one of noto-sans-myanmar, /);
  });

  it("stops on a family of the other language", async () => {
    const error = await loadError(
      book({ ...base, language: "en", font: { family: "noto-sans-myanmar" } }),
    );
    expect(error.reason).toBe(
      "font.family: noto-sans-myanmar is a Myanmar family; English books use noto-sans or noto-serif",
    );
  });

  it("stops when font_set and font.family disagree, naming both", async () => {
    const error = await loadError(
      book({ ...base, font_set: "serif", font: { family: "noto-sans-myanmar" } }),
    );
    expect(error.reason).toBe(
      "font_set: serif selects noto-serif-myanmar, but font.family is noto-sans-myanmar; remove font_set",
    );
  });

  it("warns about unknown keys inside page and font", async () => {
    const { warnings } = await loadConfig(book({ ...base, page: { width: 100 } }));
    expect(warnings).toEqual(["unknown key: page.width"]);
  });

  it("defaults the running heads and feet to the current layout", async () => {
    const { config } = await loadConfig(book(base));
    expect(config.running).toEqual({
      top: { inner: "chapter-title", center: "none", outer: "author" },
      bottom: { inner: "book-title", center: "none", outer: "page-number" },
    });
  });

  it("merges a partial running layout over the defaults", async () => {
    const { config } = await loadConfig(
      book({
        ...base,
        running: { bottom: { inner: "none", center: "page-number", outer: "none" } },
      }),
    );
    expect(config.running).toEqual({
      top: { inner: "chapter-title", center: "none", outer: "author" },
      bottom: { inner: "none", center: "page-number", outer: "none" },
    });
  });

  it("stops on an unknown running value, listing the values", async () => {
    const error = await loadError(book({ ...base, running: { top: { center: "date" } } }));
    expect(error.reason).toBe(
      "running.top.center: must be one of author, book-title, chapter-title, page-number, none",
    );
  });

  it("warns about an unknown running slot", async () => {
    const { warnings } = await loadConfig(
      book({ ...base, running: { top: { middle: "author" } } }),
    );
    expect(warnings).toEqual(["unknown key: running.top.middle"]);
  });

  it("stops on invalid JSON, naming the file", async () => {
    const dir = tempDir({ "book.json": "{ nope" });
    const error = await loadError(join(dir, "book.json"));
    expect(error.subject).toBe(join(dir, "book.json"));
    expect(error.reason).toMatch(/^invalid JSON/);
  });
});
