import { vi } from "vitest";
import type { BookConfig } from "../../src/config/load.ts";
import { fetchFontSet } from "../../src/fonts/fetch.ts";
import { getFontSet, loadManifest } from "../../src/fonts/manifest.ts";
import { FIXTURE_FONTS, FIXTURE_MANIFEST } from "./fonts.ts";
import { tempDir } from "./temp.ts";

/** A font cache holding the config's set, fetched from the fixture fonts; returns its root. */
export async function fixtureFontCache(config: BookConfig): Promise<string> {
  vi.stubEnv("MD2BOOK_FONTS_SOURCE", FIXTURE_FONTS);
  const root = tempDir();
  const manifest = await loadManifest(FIXTURE_MANIFEST);
  await fetchFontSet(getFontSet(manifest, config.language, config.font_set), {
    fontsDir: root,
    manifest,
  });
  return root;
}
