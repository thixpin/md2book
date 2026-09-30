import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tempDir } from "../helpers/temp.ts";
import * as api from "../../src/index.ts";

// Constitution VIII: the programmatic API mirrors the CLI commands and nothing else.
const PUBLIC = ["all", "cover", "epub", "init", "fonts", "pdf", "qa", "serve", "web"];
const INTERNAL = [
  "loadConfig",
  "loadChapters",
  "loadParts",
  "tocListHtml",
  "expandSnippets",
  "renderMarkdown",
  "renderChapter",
  "chapterHeadHtml",
];

describe("public API", () => {
  it("exports only the functions that mirror CLI commands", () => {
    const names = Object.keys(api);
    expect(names.sort()).toEqual([...PUBLIC].sort());
    expect(names.filter((name) => INTERNAL.includes(name))).toEqual([]);
  });

  it("init takes the same presets as the CLI flags (spec 006 FR-023)", async () => {
    const dir = tempDir();
    await api.init({
      dir,
      lang: "en",
      title: "T",
      author: "A",
      pageSize: "letter",
      fontFamily: "noto-serif",
      fontSize: "xl",
      chapters: "book/chapters",
    });
    const config = JSON.parse(readFileSync(join(dir, "book.json"), "utf8")) as Record<
      string,
      unknown
    >;
    expect(config).toMatchObject({
      page: { size: "letter" },
      font: { family: "noto-serif", size: "xl" },
      chapter_glob: "book/chapters/chapter-*.md",
    });
  });
});
