import { loadConfig } from "../config/load.ts";
import { fetchFontSet } from "./fetch.ts";
import { fontSetById, configFontSet, loadManifest } from "./manifest.ts";

export interface FontsOptions {
  /** Book config whose `language` and `font_set` pick the set (default book.json). */
  config?: string;
  /** Set id instead of a config: my-sans, my-serif, en-sans, en-serif. */
  set?: string;
  /** Cache root (overrides MD2BOOK_FONTS). */
  fontsDir?: string;
}

/** `md2book fonts`. `manifestPath` is internal and test-only. */
export async function runFonts(
  options: FontsOptions,
  manifestPath?: string,
): Promise<{ dir: string; files: string[] }> {
  const manifest = await loadManifest(manifestPath);
  let set;
  if (options.set) {
    set = fontSetById(manifest, options.set);
  } else {
    const { config } = await loadConfig(options.config ?? "book.json");
    set = configFontSet(manifest, config);
  }
  return fetchFontSet(set, { fontsDir: options.fontsDir, manifest });
}
