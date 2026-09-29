import { resolve } from "node:path";
import { loadBook } from "../book/load.ts";
import { loadConfig } from "../config/load.ts";
import { endImage } from "../epub/build.ts";
import { defaultOut } from "../web/command.ts";
import { buildPdf } from "./build.ts";

export interface PdfOptions {
  /** Book config path. */
  config: string;
  /** Output directory (default `dist/<config name>/`). */
  out?: string;
  /** The print-shop interior: no cover, no colour. */
  printed?: boolean;
}

/** `md2book build pdf`. `manifestPath` is internal and test-only; `log` receives progress lines. */
export async function runPdf(
  options: PdfOptions,
  manifestPath?: string,
  log: (line: string) => void = () => {},
): Promise<{ file: string }> {
  const { config } = await loadConfig(options.config);
  const book = await loadBook(config);
  const message = endImage(config).message;
  if (message) log(message);
  const result = await buildPdf(book, {
    out: resolve(options.out ?? defaultOut(options.config)),
    printed: options.printed ?? false,
    manifestPath,
  });
  log(`PDF written: ${result.file}`);
  return result;
}
