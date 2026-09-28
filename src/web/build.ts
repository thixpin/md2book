import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import type { BookConfig } from "../config/load.ts";
import { requireFontSet } from "../fonts/require.ts";
import { loadPublishedChapters } from "../manuscript/chapters.ts";
import { loadParts } from "../manuscript/parts.ts";
import { expandSnippets } from "../manuscript/snippets.ts";
import { renderChapter } from "../markdown/render.ts";
import { writeAssets } from "./assets.ts";
import { writeBackCover } from "./back-cover.ts";
import { coverFacts, writeFavicons, writeOgImage } from "./images.ts";
import { pageDescription } from "./description.ts";
import { warn } from "../errors.ts";
import { page } from "./page.ts";
import {
  chapterHref,
  computeBookKey,
  readerHtml,
  readerToolbar,
  type WebBook,
} from "./reader-dom.ts";

export interface WebBuildOptions {
  /** Output directory; the site goes to `<out>/web/`. */
  out: string;
  fontsDir?: string;
  /** Internal, test-only font manifest override. */
  manifestPath?: string;
}

/** Builds the static web edition of the allow-listed chapters (spec 002). */
export async function buildWeb(
  config: BookConfig,
  options: WebBuildOptions,
): Promise<{ dir: string; chapters: number }> {
  const { set, dir: fontsDir } = await requireFontSet(config, options);
  const chapters = await loadPublishedChapters(config);
  const parts = await loadParts(config, chapters);
  for (const ch of chapters) {
    expandSnippets(ch, config.code_root);
    renderChapter(ch, config.strings);
  }

  const web = join(options.out, "web");
  rmSync(web, { recursive: true, force: true });
  mkdirSync(join(web, "fonts"), { recursive: true });
  const assets = writeAssets(web, set, fontsDir);
  const coverName = `cover${extname(config.cover)}`;
  copyFileSync(config.cover, join(web, coverName));

  const favicon = await writeFavicons(config, web);
  const facts = await coverFacts(config.cover);
  await writeOgImage(config.cover, web, facts);
  if (!config.web_url) {
    warn("web_url is not set; canonical and og:url are omitted and og:image is relative");
  }
  const book: WebBook = {
    config,
    chapters,
    parts,
    bookKey: computeBookKey(config, options.out, chapters),
    coverName,
    backCoverName: await writeBackCover(config, web, facts, set, fontsDir),
    facts,
  };

  const bookDescription = config.description || config.subtitle || config.title;
  const common = { stylesheet: assets.stylesheet, favicon };
  const reader = { ...common, script: assets.script, headerTools: readerToolbar() };
  writeFileSync(
    join(web, "index.html"),
    page(config, {
      ...reader,
      title: config.title,
      content: readerHtml(book, ""),
      description: bookDescription,
      path: "/",
      ogType: "book",
    }),
  );
  mkdirSync(join(web, "chapters"));
  for (const ch of chapters) {
    writeFileSync(
      join(web, "chapters", `${ch.slug}.html`),
      page(config, {
        ...reader,
        title: `${config.title} | ${ch.title}`,
        content: readerHtml(book, ch.slug),
        description: pageDescription(ch.html ?? "", bookDescription),
        path: chapterHref(ch.slug),
        ogType: "article",
      }),
    );
  }
  writeFileSync(
    join(web, "404.html"),
    page(config, {
      ...common,
      title: `${config.title} | Page not found`,
      content: '<h1>Page not found</h1><p><a href="/">Open the book</a></p>',
      description: bookDescription,
      path: null,
    }),
  );
  return { dir: web, chapters: chapters.length };
}
