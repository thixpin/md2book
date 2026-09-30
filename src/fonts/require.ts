import { existsSync } from "node:fs";
import { join } from "node:path";
import type { BookConfig } from "../config/load.ts";
import { BookError } from "../errors.ts";
import { fontsRoot, setDir } from "./cache.ts";
import { configFontSet, loadManifest, setFiles, type FontSet } from "./manifest.ts";

/** The configured font set's cache directory; stops with the fix command if any file is missing. */
export async function requireFontSet(
  config: BookConfig,
  options: { fontsDir?: string; manifestPath?: string } = {},
): Promise<{ set: FontSet; dir: string }> {
  const set = configFontSet(await loadManifest(options.manifestPath), config);
  return { set, dir: requireSet(set, options, `md2book fonts --config ${config.configPath}`) };
}

/** The set's cache directory; stops with `fix` (the command to run) if any file is missing. */
export function requireSet(set: FontSet, options: { fontsDir?: string }, fix: string): string {
  const dir = setDir(fontsRoot(options), set.id);
  if (setFiles(set).some(({ file }) => !existsSync(join(dir, file)))) {
    throw new BookError(dir, `font set ${set.id} not found; run: ${fix}`);
  }
  return dir;
}
