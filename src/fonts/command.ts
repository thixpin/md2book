import { loadConfig } from "../config/load.ts";
import { BookError } from "../errors.ts";
import { fetchFontSet } from "./fetch.ts";
import { fontSetById, getFontSet, loadManifest } from "./manifest.ts";

export interface FontsOptions {
  /** Book config whose `language` and `font_set` pick the set. */
  config?: string;
  /** Set id instead of a config: my-sans, my-serif, en-sans, en-serif. */
  set?: string;
  /** Cache root (overrides MD2BOOK_FONTS). */
  fontsDir?: string;
}

/** `book-build fonts`. `manifestPath` is internal and test-only. */
export async function runFonts(
  options: FontsOptions,
  manifestPath?: string,
): Promise<{ dir: string; files: string[] }> {
  if (!options.config && !options.set)
    throw new BookError("fonts", "give --config <path> or --set <id>");
  const manifest = await loadManifest(manifestPath);
  let set;
  if (options.set) {
    set = fontSetById(manifest, options.set);
  } else {
    const { config } = await loadConfig(options.config!);
    set = getFontSet(manifest, config.language, config.font_set);
  }
  return fetchFontSet(set, { fontsDir: options.fontsDir, manifest });
}
