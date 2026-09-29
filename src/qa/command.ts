import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadBook } from "../book/load.ts";
import { loadConfig } from "../config/load.ts";
import { runEpub, type EpubOptions } from "../epub/command.ts";
import { BookError } from "../errors.ts";
import { getFontSet, loadManifest } from "../fonts/manifest.ts";
import { requireFontSet } from "../fonts/require.ts";
import { defaultOut } from "../web/command.ts";
import { fontCoverage, type Coverage } from "./coverage.ts";
import { epubChecks } from "./epub-checks.ts";
import { qaReport } from "./report.ts";
import { unicodeChecks } from "./unicode.ts";

export type QaOptions = EpubOptions;

/** `md2book qa`: writes `<out>/QA-REPORT.md`; checks `<out>/<output_name>.epub` if present. */
export async function runQa(
  options: QaOptions,
  manifestPath?: string,
  log: (line: string) => void = () => {},
): Promise<{ file: string }> {
  const { config } = await loadConfig(options.config);
  const book = await loadBook(config);
  const out = resolve(options.out ?? defaultOut(options.config));
  const set = getFontSet(await loadManifest(manifestPath), config.language, config.font_set);

  let coverage: Coverage | undefined;
  try {
    const { dir } = await requireFontSet(config, { manifestPath });
    coverage = fontCoverage(book.chapters, set, dir);
  } catch (error) {
    if (!(error instanceof BookError)) throw error;
  }
  const epubFile = join(out, `${config.output_name}.epub`);
  const epub = existsSync(epubFile)
    ? { file: epubFile, checks: await epubChecks(epubFile, book.chapters) }
    : undefined;

  const report = qaReport({
    book,
    issues: await unicodeChecks(book.chapters),
    set,
    coverage,
    fontsCommand: `md2book fonts --config ${config.configPath}`,
    epub,
    generated: new Date(),
  });
  mkdirSync(out, { recursive: true });
  const file = join(out, "QA-REPORT.md");
  writeFileSync(file, report);
  log(`QA report written: ${file}`);
  return { file };
}

/** `md2book all`: EPUB, then QA (the PDF step comes with the PDF feature). */
export async function runAll(
  options: QaOptions,
  manifestPath?: string,
  log: (line: string) => void = () => {},
): Promise<{ epub: string; report: string }> {
  const { file: epub } = await runEpub(options, manifestPath, log);
  const { file: report } = await runQa(options, manifestPath, log);
  return { epub, report };
}
