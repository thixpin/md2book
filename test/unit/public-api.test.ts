import { describe, expect, it } from "vitest";
import * as api from "../../src/index.ts";

// Constitution VIII: the programmatic API mirrors the CLI (init, fonts) and nothing else.
const PUBLIC = ["init", "fonts"];
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
    expect(names.every((name) => PUBLIC.includes(name))).toBe(true);
    expect(names.filter((name) => INTERNAL.includes(name))).toEqual([]);
  });
});
