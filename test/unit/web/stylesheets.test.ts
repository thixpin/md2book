import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { epubStylesheets, substituteFonts } from "../../../src/web/assets.ts";
import { loadManifest } from "../../../src/fonts/manifest.ts";
import { FIXTURE_MANIFEST } from "../../helpers/fonts.ts";

const asset = (path: string) =>
  readFileSync(new URL(`../../../assets/${path}`, import.meta.url), "utf8");

describe("font substitution", () => {
  it("leaves my-sans stylesheets unchanged", async () => {
    const { sets } = await loadManifest(FIXTURE_MANIFEST);
    expect(epubStylesheets(sets["my-sans"])).toEqual({
      common: asset("css/common.css"),
      epub: asset("css/epub.css"),
    });
  });

  it("points every face of epub.css at another set's files and families", async () => {
    const { sets } = await loadManifest(FIXTURE_MANIFEST);
    const { epub } = epubStylesheets(sets["en-serif"]);
    expect(epub).not.toContain('"Noto Sans Myanmar"');
    expect(epub).not.toContain("NotoSansMyanmar-");
    for (const file of [
      "NotoSans-Regular.ttf",
      "NotoSans-SemiBold.ttf",
      "NotoSans-Bold.ttf",
      "NotoSans-Italic.ttf",
      "NotoSans-BoldItalic.ttf",
      "NotoSansMono-Regular.ttf",
      "NotoSansMono-Bold.ttf",
    ]) {
      expect(epub).toContain(`../fonts/${file}`);
    }
    expect(epub).toContain('font-family: "Noto Serif"');
  });

  it("is the identity for my-sans", async () => {
    const { sets } = await loadManifest(FIXTURE_MANIFEST);
    expect(substituteFonts("x NotoSansMyanmar-Bold.ttf", sets["my-sans"])).toBe(
      "x NotoSansMyanmar-Bold.ttf",
    );
  });
});
