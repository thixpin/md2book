import { vi } from "vitest";
import type { BookConfig } from "../../src/config/load.ts";
import { fetchFontSet } from "../../src/fonts/fetch.ts";
import { configFontSet, loadManifest } from "../../src/fonts/manifest.ts";
import { FIXTURE_FONTS, FIXTURE_MANIFEST, PRINT_FONTS, PRINT_MANIFEST } from "./fonts.ts";
import { tempDir } from "./temp.ts";

/** A font cache holding the config's set, fetched from the fixture fonts; returns its root. */
export async function fixtureFontCache(config: BookConfig, print = false): Promise<string> {
  vi.stubEnv("MD2BOOK_FONTS_SOURCE", print ? PRINT_FONTS : FIXTURE_FONTS);
  const root = tempDir();
  const manifest = await loadManifest(print ? PRINT_MANIFEST : FIXTURE_MANIFEST);
  await fetchFontSet(configFontSet(manifest, config), {
    fontsDir: root,
    manifest,
  });
  return root;
}
