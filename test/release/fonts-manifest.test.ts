import { describe, expect, it } from "vitest";
import { FONT_FAMILIES } from "../../src/config/language.ts";
import { loadManifest } from "../../src/fonts/manifest.ts";

// Maintainer-only (`npm run test:release`): checks the shipped manifest after T067 builds it.
const MY_SANS = [
  "NotoSansMyanmar-Regular.ttf",
  "NotoSansMyanmar-SemiBold.ttf",
  "NotoSansMyanmar-Bold.ttf",
  "NotoSansMyanmar-Italic.ttf",
  "NotoSansMyanmar-BoldItalic.ttf",
  "NotoSansMono-Regular.ttf",
  "NotoSansMono-Bold.ttf",
];

describe("shipped font manifest", () => {
  it("passes the manifest validator", async () => {
    await expect(loadManifest()).resolves.toBeTruthy();
  });

  it("lists exactly the Python toolchain's file names for my-sans", async () => {
    const manifest = await loadManifest();
    expect(manifest.sets["my-sans"].faces.map((f) => f.file)).toEqual(MY_SANS);
    expect(manifest.sets["my-sans"].licence.file).toBe("LICENSE-OFL.txt");
  });

  it("matches the body family catalogue used for typeface_line", async () => {
    const manifest = await loadManifest();
    for (const [id, family] of Object.entries(FONT_FAMILIES)) {
      expect(manifest.sets[id as keyof typeof FONT_FAMILIES].body_family).toBe(family);
    }
  });
});
