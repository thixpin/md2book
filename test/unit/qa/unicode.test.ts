import { describe, expect, it } from "vitest";
import type { Chapter } from "../../../src/manuscript/chapters.ts";
import { formatIssues, pyRepr, unicodeChecks } from "../../../src/qa/unicode.ts";
import { fixture, tempDir } from "../../helpers/temp.ts";
import { join } from "node:path";

const source = (path: string) => ({ sourcePath: path }) as Chapter;

describe("unicodeChecks", () => {
  it("reports exactly one entry per seeded issue, like the reference", async () => {
    const issues = await unicodeChecks([source(fixture("book-qa", "chapters", "chapter-01.md"))]);
    expect(issues).toEqual([
      "chapter-01.md: text is not NFC-normalized (build normalizes it)",
      "chapter-01.md: 1 x U+FFFD replacement char",
      "chapter-01.md: 1 x zero-width space",
      "chapter-01.md: 1 x no-break space",
      "chapter-01.md: 1 x BOM",
      "chapter-01.md: 1 control characters",
      "chapter-01.md:15: doubled vowel/medial sign 'ိိ'",
      "chapter-01.md:17: doubled punctuation '။။'",
      "chapter-01.md: 1 x space before ။/၊ (reported, not changed)",
      "chapter-01.md:21: double space inside prose line",
      "chapter-01.md:23: repeated word 'မြန်မာ'",
      "chapter-01.md:25: HTML tag in manuscript",
    ]);
  });

  it("reads CRLF like Python's text mode (no control-character report)", async () => {
    const dir = tempDir({ "chapter-01.md": "# အခန်း (၁) - T\r\n\r\nစာ\r\n" });
    expect(await unicodeChecks([source(join(dir, "chapter-01.md"))])).toEqual([]);
  });

  it("caps the list at 200 entries", () => {
    const issues = Array.from({ length: 205 }, (_, i) => `x:${i}: issue`);
    const lines = formatIssues(issues);
    expect(lines).toHaveLength(201);
    expect(lines.at(-1)).toBe("- ... 5 more");
  });

  it("says no issues were found for a clean manuscript", () => {
    expect(formatIssues([])).toEqual([
      "- No issues found (NFC, no replacement/control chars, no doubled signs or punctuation, no repeated words, no HTML tags).",
    ]);
  });
});

describe("pyRepr", () => {
  it("quotes like Python's repr", () => {
    expect(pyRepr("ab")).toBe("'ab'");
    expect(pyRepr("it's")).toBe(`"it's"`);
    expect(pyRepr(`a'b"c`)).toBe(`'a\\'b"c'`);
  });
});
