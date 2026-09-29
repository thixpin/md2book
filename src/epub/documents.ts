import type { Book } from "../book/load.ts";
import type { BookConfig } from "../config/load.ts";
import { tocListHtml } from "../manuscript/toc.ts";
import { escapeHtml as esc } from "../manuscript/text.ts";
import { chapterHeadHtml } from "../markdown/chapter-head.ts";
import { frontMatterHtml } from "./front-matter.ts";

export interface EpubDocument {
  id: string;
  href: string;
  content: string;
}

/** One XHTML document (port of build.py `xhtml_doc`). */
export function xhtmlDoc(
  config: BookConfig,
  title: string,
  body: string,
  bodyClass = "",
  epubType = "",
): string {
  const attrs =
    (bodyClass ? ` class="${bodyClass}"` : "") + (epubType ? ` epub:type="${epubType}"` : "");
  return (
    '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n' +
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" ' +
    `xml:lang="${config.language}" lang="${config.language}">\n` +
    `<head><meta charset="utf-8"/><title>${esc(title)}</title>` +
    '<link rel="stylesheet" type="text/css" href="../css/common.css"/>' +
    '<link rel="stylesheet" type="text/css" href="../css/epub.css"/></head>\n' +
    `<body${attrs}>\n${body}\n</body>\n</html>\n`
  );
}

/** Reading order: cover, title, copyright, nav, chapters, then the end image when enabled. */
export function epubDocuments(
  book: Book,
  coverName: string,
  endName: string | undefined,
): EpubDocument[] {
  const { config, chapters, parts } = book;
  const { titlePage, copyrightPage } = frontMatterHtml(config);
  const heading = config.strings.contents_heading;
  const docs: EpubDocument[] = [
    {
      id: "cover",
      href: "text/cover.xhtml",
      content: xhtmlDoc(
        config,
        config.title,
        `<div class="cover"><img src="../images/${coverName}" alt="Cover"/></div>`,
        "cover-body",
        "cover",
      ),
    },
    {
      id: "titlepage",
      href: "text/title.xhtml",
      content: xhtmlDoc(config, config.title, titlePage, "", "titlepage"),
    },
    {
      id: "copyright",
      href: "text/copyright.xhtml",
      content: xhtmlDoc(config, "Copyright", copyrightPage, "", "copyright-page"),
    },
    {
      id: "nav",
      href: "text/nav.xhtml",
      content: xhtmlDoc(
        config,
        heading,
        `<nav epub:type="toc" id="toc"><h1>${esc(heading)}</h1>${tocListHtml(parts, chapters, "{slug}.xhtml")}</nav>` +
          '<nav epub:type="landmarks" hidden="hidden"><ol>' +
          '<li><a epub:type="cover" href="cover.xhtml">Cover</a></li>' +
          '<li><a epub:type="toc" href="nav.xhtml">Table of Contents</a></li>' +
          `<li><a epub:type="bodymatter" href="${chapters[0]!.slug}.xhtml">Start</a></li>` +
          "</ol></nav>",
      ),
    },
  ];
  for (const ch of chapters) {
    const body = `<section epub:type="chapter" id="${ch.slug}">${chapterHeadHtml(ch)}${ch.html ?? ""}</section>`;
    docs.push({
      id: ch.slug,
      href: `text/${ch.slug}.xhtml`,
      content: xhtmlDoc(config, ch.fullTitle, body, "", "bodymatter"),
    });
  }
  if (endName) {
    docs.push({
      id: "endimage",
      href: "text/end.xhtml",
      content: xhtmlDoc(
        config,
        config.title,
        `<div class="end-image"><img src="../images/${endName}" alt=""/></div>`,
        "end-image-body",
        "backmatter",
      ),
    });
  }
  return docs;
}
