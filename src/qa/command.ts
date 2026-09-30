import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadBook } from "../book/load.ts";
import { loadConfig } from "../config/load.ts";
import { runEpub, type EpubOptions } from "../epub/command.ts";
import { BookError } from "../errors.ts";
import { configFontSet, loadManifest } from "../fonts/manifest.ts";
import { requireFontSet } from "../fonts/require.ts";
import { defaultOut, runWeb, webWrittenLine } from "../web/command.ts";
import { fontCoverage, type Coverage } from "./coverage.ts";
import { epubChecks } from "./epub-checks.ts";
import { pdfName } from "../pdf/build.ts";
import { runPdf } from "../pdf/command.ts";
import { pdfChecks } from "./pdf-checks.ts";
import { pdfFacts } from "./pdf-read.ts";
import { writeSamples } from "./pdf-samples.ts";
import { qaReport, type ReportInput } from "./report.ts";
import { unicodeChecks } from "./unicode.ts";

export interface QaOptions extends EpubOptions {
  /** Check (and for `build all`, build) the printed edition's PDF instead of the screen PDF. */
  printed?: boolean;
}

/**
 * `md2book qa`: writes `<out>/QA-REPORT.md`; checks the edition's PDF (with sample renders in
 * `<out>/qa-pages/`) and `<out>/<output_name>.epub` when they exist.
 */
export async function runQa(
  options: QaOptions,
  manifestPath?: string,
  log: (line: string) => void = () => {},
): Promise<{ file: string }> {
  const { config } = await loadConfig(options.config);
  const book = await loadBook(config);
  const out = resolve(options.out ?? defaultOut(options.config));
  const set = configFontSet(await loadManifest(manifestPath), config);

  let coverage: Coverage | undefined;
  try {
    const { dir } = await requireFontSet(config, { manifestPath });
    coverage = fontCoverage(book.chapters, set, dir);
  } catch (error) {
    if (!(error instanceof BookError)) throw error;
  }
  const printed = options.printed ?? false;
  const pdfFile = join(out, pdfName(config.output_name, printed, config.page.suffix));
  let pdf: ReportInput["pdf"];
  if (existsSync(pdfFile)) {
    const facts = await pdfFacts(pdfFile);
    const checks = pdfChecks(facts, book.chapters, printed);
    await writeSamples(pdfFile, checks.samples, join(out, "qa-pages"));
    pdf = { file: pdfFile, printed, facts, checks };
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
    pdf,
    generated: new Date(),
  });
  mkdirSync(out, { recursive: true });
  const file = join(out, "QA-REPORT.md");
  writeFileSync(file, report);
  log(`QA report written: ${file}`);
  return { file };
}

/** `md2book build all`: PDF, EPUB, web edition (when chapters are published), then QA. */
export async function runAll(
  options: QaOptions,
  manifestPath?: string,
  log: (line: string) => void = () => {},
): Promise<{ pdf: string; epub: string; web?: string; report: string }> {
  const { file: pdf } = await runPdf(options, manifestPath, log);
  const { file: epub } = await runEpub(options, manifestPath, log);
  let web: string | undefined;
  const { config } = await loadConfig(options.config);
  if (config.web_published_chapters === undefined) {
    log("Web edition: skipped (web_published_chapters is not set)");
  } else {
    const built = await runWeb(options, manifestPath);
    web = built.dir;
    log(webWrittenLine(built));
  }
  const { file: report } = await runQa(options, manifestPath, log);
  return { pdf, epub, web, report };
}
