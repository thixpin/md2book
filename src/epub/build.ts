import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import yazl from "yazl";
import type { Book } from "../book/load.ts";
import type { BookConfig } from "../config/load.ts";
import { BookError } from "../errors.ts";
import { setFiles } from "../fonts/manifest.ts";
import { requireFontSet } from "../fonts/require.ts";
import { epubStylesheets } from "../web/assets.ts";
import { epubDocuments } from "./documents.ts";
import { CONTAINER_XML, IMAGE_TYPES, ncxXml, opfXml } from "./package.ts";

export interface EpubBuildOptions {
  out: string;
  fontsDir?: string;
  /** Internal, test-only font manifest override. */
  manifestPath?: string;
  /** `dcterms:modified`; defaults to now. */
  now?: Date;
}

export interface EndImage {
  /** The image file, when it is included. */
  path?: string;
  /** Build-log line, when `end_image` is set. */
  message?: string;
}

/**
 * The end image appears only once its gate chapter (`end_image_after`, in the chapter directory)
 * exists; without a gate it is always included (build.py `load_meta`).
 */
export function endImage(config: BookConfig): EndImage {
  if (!config.end_image) return {};
  const chapterDir = dirname(config.chapter_glob);
  const gate = config.end_image_after ? join(chapterDir, config.end_image_after) : undefined;
  if (!gate || existsSync(gate)) return { path: config.end_image, message: "End image: included" };
  return {
    message: `End image: withheld (${basename(gate)} not in ${basename(chapterDir)}/)`,
  };
}

// A fixed entry time keeps the zip free of build timestamps (Constitution VII); DOS-only times
// avoid extra fields, which the OCF forbids on `mimetype`.
const ENTRY_OPTIONS = { mtime: new Date(1980, 0, 1), forceDosTimestamp: true };

function listFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name).slice(dir.length + 1))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Reflowable EPUB 3 of the whole book (port of build.py `build_epub`). */
export async function buildEpub(book: Book, options: EpubBuildOptions): Promise<{ file: string }> {
  const { config } = book;
  const { set, dir: fontsDir } = await requireFontSet(config, options);
  const coverExt = extname(config.cover).slice(1).toLowerCase();
  if (!IMAGE_TYPES[coverExt]) throw new BookError(config.cover, "cover must be PNG or JPEG");
  const coverName = `cover.${coverExt}`;
  const end = endImage(config).path;
  const endName = end ? `end.${extname(end).slice(1).toLowerCase()}` : undefined;
  if (end && !existsSync(end)) throw new BookError(end, "end_image not found");

  const docs = epubDocuments(book, coverName, endName);
  const fonts = setFiles(set).filter(({ file }) => file.endsWith(".ttf"));

  const src = join(options.out, "src", "epub");
  rmSync(src, { recursive: true, force: true });
  mkdirSync(join(src, "META-INF"), { recursive: true });
  for (const sub of ["text", "css", "fonts", "images"])
    mkdirSync(join(src, "OEBPS", sub), { recursive: true });
  const write = (path: string, content: string | Buffer) => writeFileSync(join(src, path), content);
  write("mimetype", "application/epub+zip");
  write("META-INF/container.xml", CONTAINER_XML);
  write(
    "OEBPS/content.opf",
    opfXml(book, docs, {
      coverName,
      endName,
      fontFiles: fonts.map((f) => f.file),
      modified: options.now ?? new Date(),
    }),
  );
  write("OEBPS/toc.ncx", ncxXml(book));
  for (const doc of docs) write(`OEBPS/${doc.href}`, doc.content);
  const css = epubStylesheets(set);
  write("OEBPS/css/common.css", css.common);
  write("OEBPS/css/epub.css", css.epub);
  for (const { file } of fonts) write(`OEBPS/fonts/${file}`, readFileSync(join(fontsDir, file)));
  write(`OEBPS/images/${coverName}`, readFileSync(config.cover));
  if (end && endName) write(`OEBPS/images/${endName}`, readFileSync(end));

  const file = join(options.out, `${config.output_name}.epub`);
  mkdirSync(options.out, { recursive: true });
  rmSync(file, { force: true });
  const zip = new yazl.ZipFile();
  zip.addBuffer(readFileSync(join(src, "mimetype")), "mimetype", {
    ...ENTRY_OPTIONS,
    compress: false,
  });
  for (const path of listFiles(src)) {
    if (path === "mimetype") continue;
    zip.addBuffer(readFileSync(join(src, path)), path, { ...ENTRY_OPTIONS, compress: true });
  }
  zip.end();
  await new Promise<void>((resolve, reject) => {
    zip.outputStream.pipe(createWriteStream(file)).on("close", resolve).on("error", reject);
  });
  return { file };
}
