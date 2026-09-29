import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
    expect(raw).toMatchObject({
      language: lang === "mm" ? "my" : lang,
      font_set: font,
      year: String(new Date().getFullYear()),
      output_name: "data-structures-algorithms",
      chapter_glob: "chapters/chapter-*.md",
      cover: "cover/cover.png",
      strings: { licence_text: MIT },
    });
    expect(raw.identifier).toMatch(/^urn:uuid:[0-9a-f-]{36}$/);
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
});
