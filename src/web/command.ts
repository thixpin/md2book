import { basename, extname, resolve } from "node:path";
import { loadConfig } from "../config/load.ts";
import { buildWeb } from "./build.ts";
import { serveDir, type Served } from "./serve.ts";

export interface WebOptions {
  /** Book config path. */
  config: string;
  /** Output directory (default `dist/<config name>/`); the site goes to `<out>/web/`. */
  out?: string;
}

export function defaultOut(configPath: string): string {
  return resolve("dist", basename(configPath, extname(configPath)));
}

/** `book-build web`. `manifestPath` is internal and test-only. */
export async function runWeb(
  options: WebOptions,
  manifestPath?: string,
): Promise<{ dir: string; chapters: number }> {
  const { config } = await loadConfig(options.config);
  return buildWeb(config, {
    out: resolve(options.out ?? defaultOut(options.config)),
    manifestPath,
  });
}

export interface ServeOptions extends WebOptions {
  /** Port on 127.0.0.1 (default 8000). */
  port?: number;
}

/** `book-build serve`: build, then serve `<out>/web/` locally until closed. */
export async function runServe(options: ServeOptions, manifestPath?: string): Promise<Served> {
  const { dir } = await runWeb(options, manifestPath);
  return serveDir(dir, options.port ?? 8000);
}
