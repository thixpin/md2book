import { describe, expect, it } from "vitest";
import type { Chapter } from "../../../src/manuscript/chapters.ts";
import { fontCoverage } from "../../../src/qa/coverage.ts";
import { loadManifest } from "../../../src/fonts/manifest.ts";
import { FIXTURE_FONTS, FIXTURE_MANIFEST } from "../../helpers/fonts.ts";

const ch = (plainText: string) => ({ plainText }) as Chapter;

describe("fontCoverage", () => {
  it("counts Myanmar and Latin characters and lists the uncovered ones by count", async () => {
    const set = (await loadManifest(FIXTURE_MANIFEST)).sets["my-sans"];
    // Fixture Myanmar faces cover U+1000–1021 and ASCII; ☃ and ✓ are covered by neither.
    const result = fontCoverage([ch("ကခ ab ✓ ☃☃\n\t"), ch("က")], set, FIXTURE_FONTS);
    expect(result.myanmar).toBe(3);
    expect(result.latin).toBe(2);
    expect(result.outside).toEqual([
      { char: "☃", count: 2, code: "U+2603", name: "SNOWMAN" },
      { char: "✓", count: 1, code: "U+2713", name: "CHECK MARK" },
    ]);
  });
});
