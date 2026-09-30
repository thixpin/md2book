import { describe, expect, it } from "vitest";
import {
  FONT_FAMILIES,
  FONT_SIZES,
  PAGE_SIZES,
  familiesFor,
  fontFamily,
} from "../../../src/config/presets.ts";

describe("presets", () => {
  it("defines the five page sizes in millimetres, default first", () => {
    expect(Object.entries(PAGE_SIZES).map(([id, p]) => [id, p.width, p.height, p.suffix])).toEqual([
      ["default", 170, 240, "170x240"],
      ["a5", 148, 210, "148x210"],
      ["b5", 176, 250, "176x250"],
      ["a4", 210, 297, "210x297"],
      ["letter", 215.9, 279.4, "216x279"],
    ]);
    expect(PAGE_SIZES.default.label).toBe("Default (170 × 240 mm)");
    expect(PAGE_SIZES.letter.label).toBe("Letter (216 × 279 mm)");
  });

  it("orders the font size factors xs < s < m < l < xl, with m exactly 1", () => {
    const factors = Object.values(FONT_SIZES).map((f) => f.factor);
    expect(Object.keys(FONT_SIZES)).toEqual(["xs", "s", "m", "l", "xl"]);
    expect(factors).toEqual([0.85, 0.92, 1, 1.1, 1.2]);
    expect(FONT_SIZES.m.label).toBe("Medium (default)");
    expect(FONT_SIZES.xs.label).toBe("Extra Small");
  });

  it("maps each family to its font set and language", () => {
    expect(fontFamily("noto-sans-myanmar")).toMatchObject({ setId: "my-sans", language: "my" });
    expect(fontFamily("noto-serif-myanmar")).toMatchObject({ setId: "my-serif", language: "my" });
    expect(fontFamily("noto-sans")).toMatchObject({ setId: "en-sans", language: "en" });
    expect(fontFamily("noto-serif")).toMatchObject({ setId: "en-serif", language: "en" });
    expect(fontFamily("comic-sans")).toBeUndefined();
    expect(Object.keys(FONT_FAMILIES)).toContain("noto-sans-myanmar");
  });

  it("lists a language's wizard families with its default first", () => {
    expect(familiesFor("my").map((f) => f.id)).toEqual([
      "noto-sans-myanmar",
      "masterpiece-uni-round",
      "padauk",
    ]);
    expect(familiesFor("en").map((f) => f.id)).toEqual(["noto-sans", "noto-serif"]);
    expect(familiesFor("my").map((f) => f.id)).not.toContain("noto-serif-myanmar");
  });
});
