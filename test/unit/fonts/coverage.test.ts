import { readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fontkit from "fontkit";
import type { Chapter } from "../../../src/manuscript/chapters.ts";
import { loadChapters } from "../../../src/manuscript/chapters.ts";
import { expandSnippets } from "../../../src/manuscript/snippets.ts";
import { renderChapter } from "../../../src/markdown/render.ts";
import { checkCoverage } from "../../../src/fonts/coverage.ts";
import { loadManifest } from "../../../src/fonts/manifest.ts";
import { bookEn } from "../../helpers/fixture-config.ts";
import { FIXTURE_FONTS, FIXTURE_MANIFEST } from "../../helpers/fonts.ts";

let stderr: string[];
beforeEach(() => {
  stderr = [];
  vi.spyOn(process.stderr, "write").mockImplementation((text) => {
    stderr.push(String(text));
    return true;
  });
});

describe("checkCoverage", () => {
  it("warns once per file and character the font set does not cover", async () => {
    const config = await bookEn();
    const chapters = await loadChapters(config);
    for (const ch of chapters) {
      expandSnippets(ch, config.code_root);
      renderChapter(ch, config.strings);
    }
    const manifest = await loadManifest(FIXTURE_MANIFEST);
    const uncovered = checkCoverage(chapters, manifest.sets["en-sans"], FIXTURE_FONTS);

    const burmese = [...new Set("မင်္ဂလာပါ")];
    expect(uncovered.map((u) => u.char)).toEqual(burmese);
    expect(new Set(uncovered.map((u) => u.file))).toEqual(new Set([chapters[1]!.sourcePath]));
    expect(chapters[0]!.uncovered).toEqual([]);
    expect(chapters[1]!.uncovered).toEqual(burmese);
    expect(stderr).toHaveLength(burmese.length);
    expect(stderr[0]).toMatch(
      /^warning: chapter-02\.md: U\+1019 "မ" is not covered by font set en-sans\n$/,
    );
  });

  it("reports nothing for Myanmar and Latin text in a Myanmar set", async () => {
    const manifest = await loadManifest(FIXTURE_MANIFEST);
    const ch = { sourcePath: "/b/chapter-01.md", plainText: "ကခ abc 123" } as Chapter;
    expect(checkCoverage([ch], manifest.sets["my-sans"], FIXTURE_FONTS)).toEqual([]);
    expect(stderr).toEqual([]);
  });

  it("fixture faces: Myanmar sets cover U+1000 and a, English sets cover a", async () => {
    const manifest = await loadManifest(FIXTURE_MANIFEST);
    for (const set of Object.values(manifest.sets)) {
      for (const face of set.faces) {
        const font = fontkit.openSync(join(FIXTURE_FONTS, face.file)) as fontkit.Font;
        expect(font.hasGlyphForCodePoint(0x61)).toBe(true);
        if (set.language === "my") expect(font.hasGlyphForCodePoint(0x1000)).toBe(true);
      }
    }
    expect(readdirSync(FIXTURE_FONTS).length).toBeGreaterThan(0);
  });
});
