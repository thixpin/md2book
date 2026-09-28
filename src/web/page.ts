import type { BookConfig } from "../config/load.ts";
import { escapeHtml as esc } from "../manuscript/text.ts";

export interface PageOptions {
  title: string;
  content: string;
  description: string;
  stylesheet: string;
  script?: string;
  headerTools?: string;
}

/**
 * One HTML page (port of web.py `_page`). All links are root-relative: the site is hosted at the
 * root of its domain and the reader changes the address between chapters.
 */
export function page(config: BookConfig, options: PageOptions): string {
  const { title, content, description, stylesheet, script = "", headerTools = "" } = options;
  return `<!doctype html>
<html lang="${esc(config.language)}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">

<link rel="stylesheet" href="/${stylesheet}"></head>
<body><header class="site-header"><a href="/" data-home><span class="site-title">${esc(config.title)}</span>
<span class="site-subtitle">${esc(config.subtitle ?? "")}</span></a>${headerTools}</header>
<main>${content}</main><footer class="footer">${esc(config.author)}</footer>
${script ? `<script src="/${script}" defer></script>` : ""}</body></html>
`;
}
