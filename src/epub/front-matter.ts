import type { BookConfig } from "../config/load.ts";
import { escapeHtml as esc } from "../manuscript/text.ts";

/** Title and copyright pages (port of build.py `front_matter_html`, strings from the config). */
export function frontMatterHtml(config: BookConfig): { titlePage: string; copyrightPage: string } {
  const title = esc(config.title);
  const subtitle = esc(config.subtitle ?? "");
  const author = esc(config.author);
  const publisher = esc(config.publisher ?? "");
  const isbn = esc(config.isbn ?? "");
  const titlePage =
    '<div class="title-page">' +
    `<p class="book-title">${title}</p>` +
    (subtitle ? `<p class="book-subtitle">${subtitle}</p>` : "") +
    `<p class="book-author">${author}</p>` +
    (publisher ? `<p class="book-publisher">${publisher}</p>` : "") +
    "</div>";
  const copyrightPage =
    '<div class="copyright-page">' +
    `<p>${title}</p>` +
    `<p>Copyright &#169; ${esc(config.year)} ${author}</p>` +
    `<p>${esc(config.strings.licence_text)}</p>` +
    (publisher ? `<p>Publisher: ${publisher}</p>` : "") +
    (isbn ? `<p>ISBN: ${isbn}</p>` : "") +
    `<p>${esc(config.strings.typeface_line)}</p>` +
    "</div>";
  return { titlePage, copyrightPage };
}
