// Public programmatic API (Constitution VIII): mirrors the CLI and exports only `init` and
// `fonts`. Internal modules are never re-exported from here.
import { runFonts, type FontsOptions } from "./fonts/command.ts";
import { runInit, type InitOptions } from "./init/init.ts";
import { runServe, runWeb, type ServeOptions, type WebOptions } from "./web/command.ts";
import type { Served } from "./web/serve.ts";

export type { FontsOptions, InitOptions, ServeOptions, Served, WebOptions };

/** `book-build init`: create book.json and chapters/chapter-01.md; resolves to the files written. */
export function init(options: InitOptions): Promise<{ files: string[] }> {
  return runInit(options);
}

/** `book-build fonts`: fetch and verify a font set; resolves to the cache dir and files. */
export function fonts(options: FontsOptions): Promise<{ dir: string; files: string[] }> {
  return runFonts(options);
}

/** `book-build web`: build the static web edition; resolves to the site dir and chapter count. */
export function web(options: WebOptions): Promise<{ dir: string; chapters: number }> {
  return runWeb(options);
}

/** `book-build serve`: build, then serve locally; resolves to the URL and a `close()` function. */
export function serve(options: ServeOptions): Promise<Served> {
  return runServe(options);
}
