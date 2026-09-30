import { basename, extname, resolve } from "node:path";
import { loadConfig, type BookConfig } from "../config/load.ts";
import { BookError } from "../errors.ts";
import { buildWeb } from "./build.ts";
import { serveDir, type Served } from "./serve.ts";
import { site } from "./site.ts";

export interface WebOptions {
  /** Book config path. */
  config: string;
  /** Output directory (default `dist/<config name>/`); the site goes to `<out>/web/`. */
  out?: string;
  /** The site's public URL for this build, in place of the config's `web_url`. */
  webUrl?: string;
}

export function defaultOut(configPath: string): string {
  return resolve("dist", basename(configPath, extname(configPath)));
}

async function webConfig(options: WebOptions): Promise<BookConfig> {
  const { config } = await loadConfig(options.config);
  if (options.webUrl === undefined) return config;
  if (!/^https?:\/\/[^/]+/.test(options.webUrl) || !URL.canParse(options.webUrl)) {
    throw new BookError(
      "--web-url",
      "must be an absolute http(s) URL, like https://book.example.com/",
    );
  }
  return { ...config, web_url: options.webUrl };
}

async function build(config: BookConfig, options: WebOptions, manifestPath?: string) {
  return buildWeb(config, {
    out: resolve(options.out ?? defaultOut(options.config)),
    manifestPath,
  });
}

/** `md2book build web`. `manifestPath` is internal and test-only. */
export async function runWeb(
  options: WebOptions,
  manifestPath?: string,
): Promise<{ dir: string; chapters: number }> {
  return build(await webConfig(options), options, manifestPath);
}

export interface ServeOptions extends WebOptions {
  /** Port on 127.0.0.1 (default 8000). */
  port?: number;
}

/**
 * `md2book serve`: build, then serve `<out>/web/` locally until closed, under the path of the
 * site's URL when it has one.
 */
export async function runServe(options: ServeOptions, manifestPath?: string): Promise<Served> {
  const config = await webConfig(options);
  const { dir } = await build(config, options, manifestPath);
  return serveDir(dir, options.port ?? 8000, site(config).root);
}

export function webWrittenLine({ dir, chapters }: { dir: string; chapters: number }): string {
  return `Web edition written: ${dir} (${chapters} published chapters)`;
}
