import type { Book } from "../book/load.ts";
import { escapeHtml as esc } from "../manuscript/text.ts";
import type { EpubDocument } from "./documents.ts";

export const CONTAINER_XML =
  '<?xml version="1.0" encoding="utf-8"?>\n' +
  '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
  '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>' +
  "</container>\n";

export const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/** EPUB 2 NCX (port of build.py). A part shares its first chapter's playOrder (epubcheck RSC-005). */
export function ncxXml(book: Book): string {
  const { config, chapters, parts } = book;
  let order = 0;
  const navPoint = (id: string, label: string, src: string, inner = "", playOrder?: number) => {
    if (playOrder === undefined) playOrder = ++order;
    return (
      `<navPoint id="${id}" playOrder="${playOrder}"><navLabel><text>${esc(label)}</text></navLabel>` +
      `<content src="${src}"/>${inner}</navPoint>`
    );
  };
  let points = "";
  let depth = 1;
  if (parts.length > 0) {
    depth = 2;
    for (const [i, part] of parts.entries()) {
      if (part.chapters.length === 0) continue;
      const partOrder = order + 1;
      const inner = part.chapters
        .map((ch) => navPoint(`np${ch.slug}`, ch.fullTitle, `text/${ch.slug}.xhtml`))
        .join("");
      points += navPoint(
        `nppart${i + 1}`,
        `${part.label} - ${part.title}`,
        `text/${part.chapters[0]!.slug}.xhtml`,
        inner,
        partOrder,
      );
    }
  } else {
    points = chapters
      .map((ch) => navPoint(`np${ch.slug}`, ch.fullTitle, `text/${ch.slug}.xhtml`))
      .join("");
  }
  return (
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">' +
    `<head><meta name="dtb:uid" content="${esc(config.identifier)}"/><meta name="dtb:depth" content="${depth}"/>` +
    '<meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head>' +
    `<docTitle><text>${esc(config.title)}</text></docTitle>` +
    `<navMap>${points}</navMap></ncx>`
  );
}

export interface OpfAssets {
  coverName: string;
  endName?: string;
  /** Font file names; listed sorted, as `font-0…`. */
  fontFiles: string[];
  /** `dcterms:modified` (UTC, seconds). */
  modified: Date;
}

const mediaType = (name: string) => IMAGE_TYPES[name.split(".").pop()!.toLowerCase()]!;

/** The package document (port of build.py). */
export function opfXml(book: Book, docs: EpubDocument[], assets: OpfAssets): string {
  const { config } = book;
  const manifest = [
    `<item id="cover-image" href="images/${assets.coverName}" media-type="${mediaType(assets.coverName)}" properties="cover-image"/>`,
    '<item id="css-common" href="css/common.css" media-type="text/css"/>',
    '<item id="css-epub" href="css/epub.css" media-type="text/css"/>',
    ...[...assets.fontFiles]
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .map((file, i) => `<item id="font-${i}" href="fonts/${file}" media-type="font/ttf"/>`),
    '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
  ];
  if (assets.endName) {
    manifest.push(
      `<item id="end-image" href="images/${assets.endName}" media-type="${mediaType(assets.endName)}"/>`,
    );
  }
  const spine: string[] = [];
  for (const doc of docs) {
    const props = doc.id === "nav" ? ' properties="nav"' : "";
    manifest.push(
      `<item id="${doc.id}" href="${doc.href}" media-type="application/xhtml+xml"${props}/>`,
    );
    spine.push(`<itemref idref="${doc.id}"${doc.id === "cover" ? ' linear="no"' : ""}/>`);
  }
  const modified = assets.modified.toISOString().replace(/\.\d{3}Z$/, "Z");
  const lang = config.language;
  return (
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    `<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${lang}">\n` +
    '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
    `<dc:identifier id="bookid">${esc(config.identifier)}</dc:identifier>\n` +
    `<dc:title>${esc(config.title)}</dc:title>\n` +
    `<dc:creator id="creator">${esc(config.author)}</dc:creator>\n` +
    `<dc:language>${lang}</dc:language>\n` +
    (config.publisher ? `<dc:publisher>${esc(config.publisher)}</dc:publisher>\n` : "") +
    `<dc:date>${esc(config.year)}</dc:date>\n` +
    `<meta property="dcterms:modified">${modified}</meta>\n` +
    '<meta name="cover" content="cover-image"/>\n' +
    "</metadata>\n" +
    `<manifest>\n${manifest.join("\n")}\n</manifest>\n` +
    `<spine toc="ncx">\n${spine.join("\n")}\n</spine>\n` +
    "</package>\n"
  );
}
