import { basename, dirname, extname, resolve } from "node:path";
import type { MarkdownIt } from "markdown-it";
import type { Chapter } from "../manuscript/chapters.ts";

// Links between chapter files (`[Next](02-setup.md)`, `[Contents](../README.md)`) name files of the
// manuscript, which no edition has. They render to marker hrefs that each edition swaps for its
// own URLs (`bookHrefs`), because the web edition, the EPUB and the PDF link chapters differently.
const CHAPTER_MARK = "md2book:chapter:";
const HOME_MARK = "md2book:home";

/** What `renderMarkdown` needs to resolve links: the chapter being rendered and the book's set. */
export interface LinkContext {
  /** The folder of the chapter file, which relative links start from. */
  dir: string;
  /** Absolute chapter file path → chapter slug, for the chapters of this edition. */
  slugs: Map<string, string>;
}

export function linkContext(chapter: Chapter, chapters: Chapter[]): LinkContext {
  return {
    dir: dirname(chapter.sourcePath),
    slugs: new Map(chapters.map((ch) => [resolve(ch.sourcePath), ch.slug])),
  };
}

/**
 * Where a Markdown link goes in the book: a chapter file → that chapter, `README.md` → the
 * book's start (its contents), another Markdown file (like an unpublished chapter) → no link,
 * and everything else (URLs, anchors, images, other files) as written.
 */
function bookTarget(href: string, context: LinkContext): string | null | undefined {
  if (/^([a-z][a-z\d+.-]*:|#|\/)/i.test(href)) return undefined;
  const path = href.replace(/[?#].*$/s, "");
  let file: string;
  try {
    file = resolve(context.dir, decodeURIComponent(path));
  } catch {
    return undefined;
  }
  const slug = context.slugs.get(file);
  if (slug) return CHAPTER_MARK + slug;
  if (/^readme\.md$/i.test(basename(file))) return HOME_MARK;
  if (extname(file).toLowerCase() === ".md") return null;
  return undefined;
}

type Env = { links?: LinkContext; unwrapped?: boolean };

/** Resolves links to manuscript files while rendering (`env.links`); without it, links stay. */
export function useBookLinks(md: MarkdownIt): void {
  md.renderer.rules.link_open = (tokens, idx, options, renderEnv, self) => {
    const env = renderEnv as Env | undefined;
    const token = tokens[idx]!;
    const href = String(token.attrGet("href") ?? "");
    const target = env?.links ? bookTarget(href, env.links) : undefined;
    if (env && target === null) {
      env.unwrapped = true;
      return "";
    }
    if (target) token.attrSet("href", target);
    return self.renderToken(tokens, idx, options);
  };
  md.renderer.rules.link_close = (tokens, idx, options, renderEnv, self) => {
    const env = renderEnv as Env | undefined;
    if (env?.unwrapped) {
      env.unwrapped = false;
      return "";
    }
    return self.renderToken(tokens, idx, options);
  };
}

/** Swaps the marker hrefs of a chapter's HTML for an edition's chapter and home URLs. */
export function bookHrefs(
  html: string,
  chapterUrl: (slug: string) => string,
  home: string,
): string {
  return html.replace(/href="md2book:(?:chapter:([^"]+)|home)"/g, (_, slug?: string) =>
    slug ? `href="${chapterUrl(slug)}"` : `href="${home}"`,
  );
}

/** True when some chapter links to the book's start (the PDF then gives its contents an id). */
export const linksHome = (html: string) => html.includes(`href="${HOME_MARK}"`);
