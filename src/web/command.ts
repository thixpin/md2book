import { basename, extname, resolve } from "node:path";
import { loadConfig } from "../config/load.ts";
import { buildWeb } from "./build.ts";

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
