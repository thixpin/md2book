import { describe, expect, it } from "vitest";
import type { Chapter } from "../../../src/manuscript/chapters.ts";
import { chapterOrderOk, manuscriptStats, pyWhitespace } from "../../../src/qa/stats.ts";
import { testConfig } from "../../helpers/config.ts";
import { tempDir } from "../../helpers/temp.ts";

const ch = (plainText: string, index = 1, label = "") => ({ plainText, index, label }) as Chapter;

describe("manuscriptStats (Python semantics)", () => {
  it("counts code points, non-whitespace, Myanmar letters and whitespace tokens", () => {
    // U+FEFF is not whitespace in Python; U+00A0 and U+0085 are.
    const stats = manuscriptStats([ch(" ကခ ab\u00a0c\u0085d\ufeff \n"), ch("x")]);
    expect(stats).toEqual({ chars: 14, charsNoSpace: 8, myanmarChars: 2, tokens: 5 });
  });

  it("treats exactly Python's str.isspace characters as whitespace", () => {
    for (const c of ["\t", "\x1c", "\x1f", "\x85", "\u00a0", "\u2028", "\u3000"]) {
      expect(pyWhitespace.test(c), JSON.stringify(c)).toBe(true);
    }
    for (const c of ["\ufeff", "\u200b", "a"]) expect(pyWhitespace.test(c)).toBe(false);
  });
});

describe("chapterOrderOk", () => {
  it("checks labels against positions in the book's digits", () => {
    const my = testConfig(tempDir(), { language: "my" });
    expect(chapterOrderOk([ch("", 1, "အခန်း (၁)"), ch("", 2, "အခန်း (၂)")], my)).toBe(true);
    expect(chapterOrderOk([ch("", 1, "အခန်း (၁)"), ch("", 2, "အခန်း (၃)")], my)).toBe(false);
    expect(chapterOrderOk([ch("", 1, "အခန်း (1)")], my)).toBe(false);
    const en = testConfig(tempDir(), { language: "en" });
    expect(chapterOrderOk([ch("", 1, "Chapter 1"), ch("", 2, "Chapter 2")], en)).toBe(true);
  });
});
