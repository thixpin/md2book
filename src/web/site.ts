import type { BookConfig } from "../config/load.ts";
import { escapeHtml as esc } from "../manuscript/text.ts";

export interface Site {
  /** `web_url` without trailing slashes, `""` when unset: the prefix of absolute page URLs. */
  base: string;
  /**
   * The path the site is served under, without a trailing slash: `""` at the root of its domain,
   * `/repo` for `https://owner.github.io/repo/` (GitHub project Pages). It prefixes every link.
   */
  root: string;
}

export function site(config: BookConfig): Site {
  const base = (config.web_url ?? "").replace(/\/+$/, "");
  let root = "";
  try {
    root = new URL(`${base}/`).pathname.replace(/\/+$/, "");
  } catch {
    // Not an absolute URL: links stay root-relative, as before.
  }
  return { base, root };
}

/** robots.txt: every page may be crawled; the sitemap is named when there is one. */
export function robotsTxt(sitemapUrl: string | null): string {
  return `User-agent: *\nAllow: /\n${sitemapUrl ? `\nSitemap: ${sitemapUrl}\n` : ""}`;
}

/**
 * sitemap.xml of the given site-relative page paths. No dates, so the same book builds the same
 * file.
 */
export function sitemapXml(base: string, paths: string[]): string {
  const urls = paths.map((path) => `  <url><loc>${esc(`${base}${path}`)}</loc></url>\n`).join("");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`
  );
}
