import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser } from "playwright";
import type { Book } from "../book/load.ts";
import { endImage } from "../epub/build.ts";
import { IMAGE_TYPES } from "../epub/package.ts";
import { BookError } from "../errors.ts";
import { requireFontSet } from "../fonts/require.ts";
import { bookImagePath, printDocument } from "./document.ts";
import { normalisePdf } from "./normalise.ts";
import { pagedBundle } from "./paged.ts";
import { renderPdf, type ServedFile } from "./render.ts";
import { printStylesheets } from "./stylesheets.ts";

export interface PdfBuildOptions {
  out: string;
  printed: boolean;
  fontsDir?: string;
  /** Internal, test-only font manifest override. */
  manifestPath?: string;
  /** Internal: extra CSS after the others (the equivalence script's reference line height). */
  extraCss?: string;
  /** Internal, test-only: how to start Chromium. */
  launch?: () => Promise<Browser>;
}

const HANDLER = fileURLToPath(new URL("../../assets/paged-handler.js", import.meta.url));

function image(file: string): ServedFile {
  const type = IMAGE_TYPES[extname(file).slice(1).toLowerCase()];
  if (!type) throw new BookError(file, "image must be PNG or JPEG");
  return { body: readFileSync(file), type };
}

/** `<output_name>-170x240.pdf`, or `-170x240-printed.pdf` for the print-shop interior. */
export function pdfName(outputName: string, printed: boolean): string {
  return `${outputName}-170x240${printed ? "-printed" : ""}.pdf`;
}

/** Port of build.py `build_pdf`: the print document, laid out by Paged.js in Chromium. */
export async function buildPdf(book: Book, options: PdfBuildOptions): Promise<{ file: string }> {
  const { config } = book;
  const { printed } = options;
  const { set, dir: fontsDir } = await requireFontSet(config, options);
  const end = endImage(config).path;

  const sheets = printStylesheets(set, config, printed);
  if (options.extraCss) sheets.push({ name: "extra.css", css: options.extraCss });
  const html = printDocument(book, {
    printed,
    stylesheets: sheets.map((sheet) => sheet.name),
    endImage: end,
  });

  const files: Record<string, ServedFile> = {
    "/pagedjs/paged.polyfill.js": { body: pagedBundle(), type: "text/javascript" },
    "/pagedjs/handler.js": { body: readFileSync(HANDLER, "utf8"), type: "text/javascript" },
  };
  for (const sheet of sheets) files[`/css/${sheet.name}`] = { body: sheet.css, type: "text/css" };
  for (const face of set.faces) {
    files[`/fonts/${face.file}`] = {
      body: readFileSync(join(fontsDir, face.file)),
      type: "font/ttf",
    };
  }
  if (!printed) files[bookImagePath("cover", config.cover)] = image(config.cover);
  if (end) files[bookImagePath("end", end)] = image(end);

  const src = join(options.out, "src");
  mkdirSync(src, { recursive: true });
  writeFileSync(join(src, printed ? "book-printed.html" : "book-print.html"), html);

  const pdf = await normalisePdf(await renderPdf({ html, files, launch: options.launch }));
  const file = join(options.out, pdfName(config.output_name, printed));
  const partial = `${file}.partial`;
  try {
    writeFileSync(partial, pdf);
    renameSync(partial, file);
  } finally {
    rmSync(partial, { force: true });
  }
  return { file };
}
