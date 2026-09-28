// Public programmatic API (Constitution VIII): mirrors the CLI and exports only `init` and
// `fonts`. Internal modules are never re-exported from here.
import { runFonts, type FontsOptions } from "./fonts/command.ts";

export type { FontsOptions };

/** `book-build fonts`: fetch and verify a font set; resolves to the cache dir and files. */
export function fonts(options: FontsOptions): Promise<{ dir: string; files: string[] }> {
  return runFonts(options);
}
