import { resolve } from "node:path";
import { loadBook } from "../book/load.ts";
import { loadConfig } from "../config/load.ts";
import { defaultOut } from "../web/command.ts";
import { buildEpub, endImage } from "./build.ts";

export interface EpubOptions {
  /** Book config path. */
  config: string;
  /** Output directory (default `dist/<config name>/`). */
  out?: string;
}

/** `book-build epub`. `manifestPath` is internal and test-only; `log` receives progress lines. */
export async function runEpub(
  options: EpubOptions,
  manifestPath?: string,
  log: (line: string) => void = () => {},
): Promise<{ file: string }> {
  const { config } = await loadConfig(options.config);
  const book = await loadBook(config);
  const message = endImage(config).message;
  if (message) log(message);
  const result = await buildEpub(book, {
    out: resolve(options.out ?? defaultOut(options.config)),
    manifestPath,
  });
  log(`EPUB written: ${result.file}`);
  return result;
}
