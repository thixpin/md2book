import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli.ts";
import { loadConfig } from "../../src/config/load.ts";
import { BookError } from "../../src/errors.ts";
import { loadChapters } from "../../src/manuscript/chapters.ts";
import { renderChapter } from "../../src/markdown/render.ts";
import { PNG_1X1, tempDir } from "../helpers/temp.ts";

const MIT = "This work is licensed under the MIT License. https://opensource.org/license/mit";

async function cli(args: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(args, {
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
    stdin: { isTTY: false },
  });
  return { code, out: out.join(""), err: err.join("") };
}

/** Runs init in a fake terminal with the keys typed ahead. */
async function tty(args: string[], keys: string) {
  const out: string[] = [];
  const err: string[] = [];
  const stdin = Object.assign(new PassThrough(), { isTTY: true });
  stdin.write(keys);
  const code = await runCli(args, {
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
    stdin,
  });
  return { code, out: out.join(""), err: err.join("") };
}

const DOWN = "\u001b[B";
const ENTER = "\r";
const readJson = (path: string) =>
  JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

describe("md2book init", () => {
  it.each([
    ["en", "sans", "# Chapter 1 - "],
    ["en", "serif", "# Chapter 1 - "],
    ["mm", "sans", "# အခန်း (၁) - "],
    ["my", "serif", "# အခန်း (၁) - "],
  ])("creates a working %s/%s project within SC-008's minute", async (lang, font, heading) => {
    const started = performance.now();
    const dir = tempDir();
    const title = "Data Structures & Algorithms";
    const result = await cli([
      "init",
      dir,
      "--lang",
      lang,
      "--font",
      font,
      "--title",
      title,
      "--author",
      "Me",
    ]);
    expect(result.code).toBe(0);
    expect(result.out.trimEnd().endsWith(`md2book fonts --config ${join(dir, "book.json")}`)).toBe(
      true,
    );
    expect(readdirSync(dir).sort()).toEqual(["book.json", "chapters"]);

    const configPath = join(dir, "book.json");
    const error: unknown = await loadConfig(configPath).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BookError);
    expect((error as BookError).reason).toBe(`cover not found: ${join(dir, "cover", "cover.png")}`);

    const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
    const family = {
      en: { sans: "noto-sans", serif: "noto-serif" },
      my: { sans: "noto-sans-myanmar", serif: "noto-serif-myanmar" },
    };
    expect(raw).toMatchObject({
      language: lang === "mm" ? "my" : lang,
      page: { size: "default" },
      font: { family: family[lang === "en" ? "en" : "my"][font as "sans" | "serif"], size: "m" },
      year: String(new Date().getFullYear()),
      output_name: "data-structures-algorithms",
      chapter_glob: "chapters/chapter-*.md",
      cover: "cover/cover.png",
      strings: { licence_text: MIT },
    });
    expect(raw.identifier).toMatch(/^urn:uuid:[0-9a-f-]{36}$/);
    expect(raw).not.toHaveProperty("font_set");
    expect(Object.keys(raw.strings as object)).toEqual(["licence_text"]);
    expect(readFileSync(join(dir, "chapters", "chapter-01.md"), "utf8").startsWith(heading)).toBe(
      true,
    );

    mkdirSync(join(dir, "cover"));
    writeFileSync(join(dir, "cover", "cover.png"), PNG_1X1);
    const { config } = await loadConfig(configPath);
    const [chapter] = await loadChapters(config);
    renderChapter(chapter!, config.strings);
    expect(chapter!.html).toContain("<p>");
    expect(performance.now() - started).toBeLessThan(60_000);
  });

  it("refuses to overwrite an existing file and writes nothing", async () => {
    const dir = tempDir({ "chapters/chapter-01.md": "mine\n" });
    const result = await cli(["init", dir, "--lang", "en", "--title", "T", "--author", "A"]);
    expect(result.code).toBe(1);
    expect(result.err).toBe(
      `md2book: ${join(dir, "chapters", "chapter-01.md")}: already exists; nothing written\n`,
    );
    expect(existsSync(join(dir, "book.json"))).toBe(false);
    expect(readFileSync(join(dir, "chapters", "chapter-01.md"), "utf8")).toBe("mine\n");
  });

  it.each([
    ["--lang", ["--title", "T", "--author", "A"]],
    ["--title", ["--lang", "en", "--author", "A"]],
    ["--author", ["--lang", "en", "--title", "T"]],
  ])("exits 1 naming %s when it is missing outside a terminal", async (flag, args) => {
    const result = await cli(["init", tempDir(), ...args]);
    expect(result.code).toBe(1);
    expect(result.err).toBe(`md2book: ${flag}: required when not running in a terminal\n`);
  });

  it("rejects an unsupported language, listing valid values", async () => {
    const result = await cli(["init", tempDir(), "--lang", "fr", "--title", "T", "--author", "A"]);
    expect(result.code).toBe(1);
    expect(result.err).toContain("valid values: my, mm, myanmar, en, english");
  });

  it("default configuration in a terminal writes the default presets (spec 006)", async () => {
    const dir = tempDir();
    const result = await tty(["init", dir], `${ENTER}${ENTER}T${ENTER}A${ENTER}`);
    expect(result.code).toBe(0);
    expect(result.out).toContain("How would you like to configure your book?");
    expect(readJson(join(dir, "book.json"))).toMatchObject({
      language: "my",
      page: { size: "default" },
      font: { family: "noto-sans-myanmar", size: "m" },
      chapter_glob: "chapters/chapter-*.md",
    });
    expect(existsSync(join(dir, "chapters", "chapter-01.md"))).toBe(true);
  });

  it("the wizard writes the chosen values and a custom chapter folder", async () => {
    const dir = tempDir();
    const keys =
      `${DOWN}${ENTER}${ENTER}T${ENTER}A${ENTER}` + // wizard, Myanmar, title, author
      `${DOWN}${ENTER}${ENTER}${DOWN}${DOWN}${DOWN}${ENTER}` + // A5, Noto, Large
      `${DOWN}${ENTER}src${ENTER}`; // Custom: src
    const result = await tty(["init", dir], keys);
    expect(result.code).toBe(0);
    expect(readJson(join(dir, "book.json"))).toMatchObject({
      page: { size: "a5" },
      font: { family: "noto-sans-myanmar", size: "l" },
      chapter_glob: "src/chapter-*.md",
    });
    expect(readdirSync(dir).sort()).toEqual(["book.json", "src"]);
    expect(existsSync(join(dir, "src", "chapter-01.md"))).toBe(true);
  });

  it("runs from flags alone outside a terminal", async () => {
    const dir = tempDir();
    const result = await cli([
      "init",
      dir,
      "--lang",
      "my",
      "--title",
      "T",
      "--author",
      "A",
      "--page-size",
      "b5",
      "--font-family",
      "noto-sans-myanmar",
      "--font-size",
      "s",
      "--chapters",
      "text",
    ]);
    expect(result.code).toBe(0);
    expect(result.out).not.toContain("?");
    expect(readJson(join(dir, "book.json"))).toMatchObject({
      page: { size: "b5" },
      font: { family: "noto-sans-myanmar", size: "s" },
      chapter_glob: "text/chapter-*.md",
    });
    expect(existsSync(join(dir, "text", "chapter-01.md"))).toBe(true);
  });

  it.each([
    [
      ["--page-size", "a6"],
      '--page-size: unsupported page size "a6"; valid values: default, a5, b5, a4, letter',
    ],
    [
      ["--font-size", "12"],
      '--font-size: unsupported font size "12"; valid values: xs, s, m, l, xl',
    ],
    [
      ["--font-family", "comic"],
      '--font-family: unsupported font family "comic" for my books; valid values: noto-sans-myanmar, noto-serif-myanmar, padauk, masterpiece-uni-round',
    ],
    [
      ["--font", "serif", "--font-family", "noto-sans-myanmar"],
      "--font-family: --font serif selects noto-serif-myanmar; give one of --font and --font-family",
    ],
    [["--chapters", "/abs"], "--chapters: must be a folder inside the book folder"],
    [["--chapters", "../out"], "--chapters: must be a folder inside the book folder"],
    [["--chapters", " "], "--chapters: must be a folder inside the book folder"],
  ])("rejects %j with one line", async (flags, message) => {
    const dir = tempDir();
    const result = await cli([
      "init",
      dir,
      "--lang",
      "my",
      "--title",
      "T",
      "--author",
      "A",
      ...flags,
    ]);
    expect(result.code).toBe(1);
    expect(result.err).toBe(`md2book: ${message}\n`);
    expect(readdirSync(dir)).toEqual([]);
  });
});
