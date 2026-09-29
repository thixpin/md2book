import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadConfig } from "../config/load.ts";
import { BookError } from "../errors.ts";
import { fontSetById, getFontSet, loadManifest, type FontSet } from "../fonts/manifest.ts";
import { requireSet } from "../fonts/require.ts";
import { renderCover } from "./render.ts";

export interface CoverOptions {
  /** The cover HTML file. */
  html: string;
  /** PNG to write (default `cover.png` next to the HTML). */
  output?: string;
  /** Resolution (default 300). */
  dpi?: number;
  /** Book config whose `language` and `font_set` pick the fonts. */
  config?: string;
  /** Font set id instead of a config (default `my-sans`). */
  set?: string;
  /** Font cache root (overrides MD2BOOK_FONTS). */
  fontsDir?: string;
}

/** `md2book cover`. `manifestPath` is internal and test-only. */
export async function runCover(
  options: CoverOptions,
  manifestPath?: string,
): Promise<{ file: string; width: number; height: number }> {
  if (options.config && options.set)
    throw new BookError("--set", "give --config or --set, not both");
  const dpi = options.dpi ?? 300;
  if (!Number.isInteger(dpi) || dpi < 1 || dpi > 1200) {
    throw new BookError("--dpi", `not a resolution in dots per inch: ${options.dpi}`);
  }
  const html = resolve(options.html);
  if (!existsSync(html)) throw new BookError(html, "cover HTML not found");

  const manifest = await loadManifest(manifestPath);
  let set: FontSet;
  let fix: string;
  if (options.config) {
    const { config } = await loadConfig(options.config);
    set = getFontSet(manifest, config.language, config.font_set);
    fix = `md2book fonts --config ${config.configPath}`;
  } else {
    set = fontSetById(manifest, options.set ?? "my-sans");
    fix = `md2book fonts --set ${set.id}`;
  }
  const fontsDir = requireSet(set, options, fix);
  const file = resolve(options.output ?? join(dirname(html), "cover.png"));
  const { width, height } = await renderCover({ html, output: file, dpi, set, fontsDir });
  return { file, width, height };
}
