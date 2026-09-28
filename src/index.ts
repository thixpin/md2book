// Public programmatic API (Constitution VIII): mirrors the CLI and exports only `init` and
// `fonts`. Internal modules are never re-exported from here.
import { runFonts, type FontsOptions } from "./fonts/command.ts";
import { runInit, type InitOptions } from "./init/init.ts";

export type { FontsOptions, InitOptions };

/** `book-build init`: create book.json and chapters/chapter-01.md; resolves to the files written. */
export function init(options: InitOptions): Promise<{ files: string[] }> {
  return runInit(options);
}

/** `book-build fonts`: fetch and verify a font set; resolves to the cache dir and files. */
export function fonts(options: FontsOptions): Promise<{ dir: string; files: string[] }> {
  return runFonts(options);
}
