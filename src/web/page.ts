import type { BookConfig } from "../config/load.ts";
import { analyticsHead } from "./analytics.ts";
import { escapeHtml as esc } from "../manuscript/text.ts";

export const OG_IMAGE = { name: "og-image.png", width: 1200, height: 630 };

export interface PageOptions {
  title: string;
  content: string;
  description: string;
  stylesheet: string;
  /** Root-relative page path; `null` for the 404 page (no canonical, not indexed). */
  path: string | null;
  script?: string;
  headerTools?: string;
  ogType?: "book" | "article";
  favicon?: boolean;
  /** An image to fetch before the page body is parsed: the reader's loading cover. */
  preloadImage?: string;
}

/**
 * One HTML page (port of web.py `_page`). All links are root-relative: the site is hosted at the
 * root of its domain and the reader changes the address between chapters.
 */
export function page(config: BookConfig, options: PageOptions): string {
  const { title, content, description, stylesheet, path } = options;
  const { script = "", headerTools = "", ogType = "book", favicon = false } = options;
  const preload = options.preloadImage
    ? `<link rel="preload" as="image" href="${esc(options.preloadImage)}" fetchpriority="high">`
    : "";
  const base = (config.web_url ?? "").replace(/\/+$/, "");
  const icons = favicon
    ? '<link rel="icon" href="/favicon.svg" type="image/svg+xml">' +
      '<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">' +
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png">'
    : "";
  const social =
    (base && path ? `<link rel="canonical" href="${base}${path}">` : "") +
    (path ? "" : '<meta name="robots" content="noindex">') +
    `<meta property="og:type" content="${ogType}">` +
    `<meta property="og:site_name" content="${esc(config.title)}">` +
    `<meta property="og:title" content="${esc(title)}">` +
    `<meta property="og:description" content="${esc(description)}">` +
    (base && path ? `<meta property="og:url" content="${base}${path}">` : "") +
    `<meta property="og:image" content="${base}/${OG_IMAGE.name}">` +
    `<meta property="og:image:width" content="${OG_IMAGE.width}">` +
    `<meta property="og:image:height" content="${OG_IMAGE.height}">` +
    `<meta property="og:image:alt" content="${esc(config.title)} cover">` +
    '<meta name="twitter:card" content="summary_large_image">';
  return `<!doctype html>
<html lang="${esc(config.language)}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${social}
${preload}<link rel="stylesheet" href="/${stylesheet}">${icons}${path ? analyticsHead(config.web_analytics) : ""}</head>
<body><header class="site-header"><a href="/" data-home><span class="site-title">${esc(config.title)}</span>
<span class="site-subtitle">${esc(config.subtitle ?? "")}</span></a>${headerTools}</header>
<main>${content}</main><footer class="footer">${esc(config.author)}</footer>
${script ? `<script src="/${script}" defer></script>` : ""}</body></html>
`;
}
