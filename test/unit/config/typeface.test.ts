import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../../../src/config/load.ts";
import { PNG_1X1, tempDir } from "../../helpers/temp.ts";

const base = {
  title: "T",
  author: "A",
  year: "2026",
  identifier: "urn:uuid:x",
  output_name: "t",
  cover: "cover.png",
  chapter_glob: "chapters/*.md",
};

async function typeface(extra: Record<string, unknown>) {
  const dir = tempDir({ "book.json": JSON.stringify({ ...base, ...extra }), "cover.png": PNG_1X1 });
  return (await loadConfig(join(dir, "book.json"))).config.strings.typeface_line;
}

describe("typeface_line default", () => {
  it.each([
    ["my", "sans", "Typeface: Noto Sans Myanmar"],
    ["my", "serif", "Typeface: Noto Serif Myanmar"],
    ["en", "sans", "Typeface: Noto Sans"],
    ["en", "serif", "Typeface: Noto Serif"],
  ])("is derived from the %s-%s font set", async (language, font_set, expected) => {
    expect(await typeface({ language, font_set })).toBe(expected);
  });

  it("keeps an explicit value", async () => {
    expect(await typeface({ strings: { typeface_line: "Typeface: Custom" } })).toBe(
      "Typeface: Custom",
    );
  });
});
