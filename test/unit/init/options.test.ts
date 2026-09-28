import { describe, expect, it } from "vitest";
import { normalizeFontStyle, normalizeLanguage } from "../../../src/init/options.ts";
import { BookError } from "../../../src/errors.ts";

describe("normalizeLanguage", () => {
  it.each(["my", "mm", "Myanmar", "MYANMAR", "MM"])("reads %s as my", (input) => {
    expect(normalizeLanguage(input)).toBe("my");
  });

  it.each(["en", "English", "EN"])("reads %s as en", (input) => {
    expect(normalizeLanguage(input)).toBe("en");
  });

  it("rejects other values, listing the valid ones", () => {
    expect(() => normalizeLanguage("fr")).toThrow(
      new BookError(
        "--lang",
        'unsupported language "fr"; valid values: my, mm, myanmar, en, english',
      ),
    );
  });
});

describe("normalizeFontStyle", () => {
  it("defaults to sans and accepts serif", () => {
    expect(normalizeFontStyle(undefined)).toBe("sans");
    expect(normalizeFontStyle("Serif")).toBe("serif");
  });

  it("rejects other values, listing sans and serif", () => {
    expect(() => normalizeFontStyle("mono")).toThrow(
      new BookError("--font", 'unsupported font set "mono"; valid values: sans, serif'),
    );
  });
});
