import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli.ts";
import { loadConfig } from "../../src/config/load.ts";
import { BookError } from "../../src/errors.ts";
import { requireFontSet } from "../../src/fonts/require.ts";
import { loadChapters } from "../../src/manuscript/chapters.ts";
import { loadParts } from "../../src/manuscript/parts.ts";
import { expandSnippets } from "../../src/manuscript/snippets.ts";
import type { Chapter } from "../../src/manuscript/chapters.ts";
import { testConfig } from "../helpers/config.ts";
import { FIXTURE_MANIFEST } from "../helpers/fonts.ts";
import { PNG_1X1, fixture, tempDir } from "../helpers/temp.ts";

const base = {
  title: "T",
  author: "A",
  year: "2026",
  identifier: "urn:uuid:x",
  output_name: "t",
  cover: "cover.png",
  chapter_glob: "chapters/chapter-*.md",
};
const configFile = (config: object) =>
  join(tempDir({ "book.json": JSON.stringify(config), "cover.png": PNG_1X1 }), "book.json");

async function caught(run: () => unknown): Promise<BookError> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(BookError);
    return error as BookError;
  }
  throw new Error("expected a BookError");
}

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

// SC-004: every error condition in this slice stops the run with one line naming the file,
// key, glob or command, and the CLI turns it into exit code 1.
const cases: [string, () => unknown][] = [
  ["missing cover", () => loadConfig(configFile({ ...base, cover: "none.png" }))],
  ["wrong config type", () => loadConfig(configFile({ ...base, title: 1 }))],
  ["unsupported language", () => loadConfig(configFile({ ...base, language: "fr" }))],
  ["unsupported font set", () => loadConfig(configFile({ ...base, font_set: "mono" }))],
  ["empty glob", () => loadChapters(testConfig(tempDir()))],
  [
    "bad chapter heading",
    () => loadChapters(testConfig(tempDir({ "chapters/chapter-01.md": "Hello\n" }))),
  ],
  [
    "bad part file",
    async () => {
      const dir = tempDir({
        "chapters/chapter-01.md": "# အခန်း (၁) - T\n",
        "chapters/part-01.md": "x\n",
      });
      const config = testConfig(dir, { part_glob: join(dir, "chapters", "part-*.md") });
      return loadParts(config, await loadChapters(config));
    },
  ],
  [
    "chapter not covered by any part",
    async () => {
      const dir = tempDir({
        "chapters/chapter-01.md": "# အခန်း (၅) - T\n",
        "chapters/part-01.md": "# Part I - P\nchapters: 1-2\n",
      });
      const config = testConfig(dir, { part_glob: join(dir, "chapters", "part-*.md") });
      return loadParts(config, await loadChapters(config));
    },
  ],
  ...(["missing.ts", "sample.ts#nope", "unclosed.ts#open"] as const).map(
    (ref): [string, () => unknown] => [
      `snippet ${ref}`,
      () =>
        expandSnippets(
          { sourcePath: "/b/chapter-01.md", bodyMd: `<!-- include: ${ref} -->\n` } as Chapter,
          fixture("code"),
        ),
    ],
  ),
  [
    "missing fonts",
    () =>
      requireFontSet(testConfig(tempDir()), {
        fontsDir: tempDir(),
        manifestPath: FIXTURE_MANIFEST,
      }),
  ],
  [
    "init target present",
    async () => {
      const { runInit } = await import("../../src/init/init.ts");
      return runInit({ dir: tempDir({ "book.json": "{}" }), lang: "en", title: "T", author: "A" });
    },
  ],
];

describe("error catalogue (SC-004)", () => {
  it.each(cases)("%s: one line naming the subject", async (_name, run) => {
    const error = await caught(run);
    expect(error.subject.length).toBeGreaterThan(0);
    expect(error.message).toBe(`book-build: ${error.subject}: ${error.reason}`);
    expect(error.message).not.toContain("\n");
  });

  it("maps a BookError to exit code 1 and a single stderr line in the CLI", async () => {
    const err: string[] = [];
    const code = await runCli(["fonts", "--config", "/no/such/book.json"], {
      stderr: (s) => err.push(s),
      manifestPath: FIXTURE_MANIFEST,
    });
    expect(code).toBe(1);
    expect(err.join("")).toBe("book-build: /no/such/book.json: cannot read config file\n");
  });
});
