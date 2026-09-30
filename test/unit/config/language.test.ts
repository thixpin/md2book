import { describe, expect, it } from "vitest";
import {
  FONT_FAMILIES,
  chapterHeadingPattern,
  defaultStrings,
  parseDigits,
} from "../../../src/config/language.ts";

const CC_LICENCE =
  "This work is licensed under the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 " +
  "International License (CC BY-NC-ND 4.0). https://creativecommons.org/licenses/by-nc-nd/4.0/";

describe("language profiles", () => {
  it("gives the Myanmar defaults", () => {
    const s = defaultStrings("my", "sans");
    expect(s.chapter_label).toBe("အခန်း");
    expect(s.chapter_digits).toBe("myanmar");
    expect(s.contents_heading).toBe("မာတိကာ");
  });

  it("gives the English defaults", () => {
    const s = defaultStrings("en", "sans");
    expect(s.chapter_label).toBe("Chapter");
    expect(s.chapter_digits).toBe("ascii");
    expect(s.contents_heading).toBe("Contents");
  });

  it.each(["my", "en"] as const)("shares the common defaults for %s", (language) => {
    const s = defaultStrings(language, "sans");
    expect(s.page_names).toEqual({
      cover: "Cover",
      contents: "Contents",
      back_cover: "Back cover",
    });
    expect(s.callout_titles).toEqual({
      note: "Note",
      warning: "Warning",
      try: "Try it yourself",
    });
    expect(s.storage_prefix).toBe("devbook");
    expect(s.licence_text).toBe(CC_LICENCE);
  });

  it("maps every font set to its body family", () => {
    expect(FONT_FAMILIES).toEqual({
      "my-sans": "Noto Sans Myanmar",
      "my-serif": "Noto Serif Myanmar",
      "en-sans": "Noto Sans",
      "en-serif": "Noto Serif",
    });
    expect(defaultStrings("my", "sans").typeface_line).toBe("Typeface: Noto Sans Myanmar");
    expect(defaultStrings("en", "serif").typeface_line).toBe("Typeface: Noto Serif");
  });
});

describe("chapter heading pattern", () => {
  const my = chapterHeadingPattern("my", "အခန်း");
  const en = chapterHeadingPattern("en", "Chapter");

  it("matches the Myanmar shape with Myanmar or ASCII digits", () => {
    expect(my.exec("# အခန်း (၁) - Title")?.slice(1)).toEqual(["အခန်း (၁)", "Title"]);
    expect(my.exec("# အခန်း (7) - Title")?.slice(1)).toEqual(["အခန်း (7)", "Title"]);
  });

  it("matches the English shape with ASCII or Myanmar digits", () => {
    expect(en.exec("# Chapter 3 - Title")?.slice(1)).toEqual(["Chapter 3", "Title"]);
    expect(en.exec("# Chapter ၃ - Title")?.slice(1)).toEqual(["Chapter ၃", "Title"]);
  });

  it("accepts an en or em dash between the label and the title, and keeps later dashes", () => {
    expect(my.exec("# အခန်း (၁) – Title")?.slice(1)).toEqual(["အခန်း (၁)", "Title"]);
    expect(my.exec("# အခန်း (၇) — Skill — Reuse")?.slice(1)).toEqual([
      "အခန်း (၇)",
      "Skill — Reuse",
    ]);
    expect(en.exec("# Chapter 3—Title")?.slice(1)).toEqual(["Chapter 3", "Title"]);
  });

  it("rejects the other language's shape", () => {
    expect(my.test("# အခန်း 1 - Title")).toBe(false);
    expect(en.test("# Chapter (3) - Title")).toBe(false);
  });

  it("uses the configured label word", () => {
    expect(chapterHeadingPattern("en", "Lesson").exec("# Lesson 2 - Loops")?.[1]).toBe("Lesson 2");
  });
});

describe("parseDigits", () => {
  it("reads Myanmar and ASCII digits", () => {
    expect(parseDigits("၁၂")).toBe(12);
    expect(parseDigits("07")).toBe(7);
  });
});
