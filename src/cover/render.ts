import { existsSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import { PDFDocument } from "pdf-lib";
import { chromium, type Browser, type Page } from "playwright";
import sharp from "sharp";
import { BookError } from "../errors.ts";
import type { FontSet } from "../fonts/manifest.ts";
import { pageSizePt } from "./page-size.ts";

const ORIGIN = "http://md2book.local";
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export interface CoverInput {
  html: string;
  output: string;
  dpi: number;
  set: FontSet;
  /** The set's cache directory. */
  fontsDir: string;
  /** Test-only: how to start Chromium. */
  launch?: () => Promise<Browser>;
}

/** The set's faces under the book's family names, so a cover that names them gets these files. */
function fontFaces(set: FontSet): string {
  return set.faces
    .map((face) => {
      const family = face.role.startsWith("mono") ? set.mono_family : set.body_family;
      const style = face.italic ? "italic" : "normal";
      return `@font-face { font-family: "${family}"; font-weight: ${face.weight}; font-style: ${style}; src: url("/fonts/${face.file}"); }`;
    })
    .join("\n");
}

/** Serves the HTML (with the fonts injected first), the fonts and files inside its folder. */
async function serve(page: Page, input: CoverInput, html: string, unexpected: string[]) {
  const folder = dirname(input.html);
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = decodeURIComponent(url.pathname);
    if (url.origin === ORIGIN) {
      if (path === `/${basename(input.html)}`) {
        return route.fulfill({ body: html, contentType: TYPES[".html"] });
      }
      const font = input.set.faces.find((face) => path === `/fonts/${face.file}`);
      if (font)
        return route.fulfill({
          body: readFileSync(join(input.fontsDir, font.file)),
          contentType: "font/ttf",
        });
      const file = resolve(folder, `.${path}`);
      if (file.startsWith(folder + sep) && existsSync(file) && statSync(file).isFile()) {
        return route.fulfill({
          body: readFileSync(file),
          contentType: TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
        });
      }
    }
    unexpected.push(url.origin === ORIGIN ? path : url.href);
    return route.abort();
  });
}

async function open(
  browser: Browser,
  input: CoverInput,
  html: string,
  scale?: { width: number; height: number; factor: number },
) {
  const context = await browser.newContext(
    scale
      ? {
          viewport: { width: Math.ceil(scale.width), height: Math.ceil(scale.height) },
          deviceScaleFactor: scale.factor,
        }
      : {},
  );
  const page = await context.newPage();
  const unexpected: string[] = [];
  await serve(page, input, html, unexpected);
  await page.goto(`${ORIGIN}/${encodeURIComponent(basename(input.html))}`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.fonts].map((face) => face.load().catch(() => undefined)));
  });
  if (unexpected.length) throw new BookError("cover", `unexpected request ${unexpected[0]}`);
  return page;
}

/**
 * Port of render_cover.py: the page (size from its `@page` rule) at `dpi`, with the book's fonts
 * (research R-01–R-03). Writes the PNG only when the cover is exactly one page.
 */
export async function renderCover(input: CoverInput): Promise<{ width: number; height: number }> {
  const source = readFileSync(input.html, "utf8");
  const style = `<style>\n${fontFaces(input.set)}\n</style>`;
  const html = /<head[^>]*>/i.test(source)
    ? source.replace(/<head[^>]*>/i, (head) => head + style)
    : style + source;

  let browser: Browser;
  try {
    browser = await (input.launch ?? (() => chromium.launch()))();
  } catch {
    throw new BookError("cover", "Chromium is not installed; run: npx playwright install chromium");
  }
  try {
    const page = await open(browser, input, html);
    const pdf = await PDFDocument.load(
      await page.pdf({ preferCSSPageSize: true, printBackground: true }),
    );
    if (pdf.getPageCount() !== 1) {
      throw new BookError(input.html, `expected 1 page, got ${pdf.getPageCount()}`);
    }
    // Chromium rounds the printed page; the `@page` rule gives the exact size.
    const declared = await page.evaluate(() => {
      let size = "";
      for (const sheet of document.styleSheets) {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSPageRule && rule.style.getPropertyValue("size")) {
            size = rule.style.getPropertyValue("size");
          }
        }
      }
      return size;
    });
    const printed = pdf.getPage(0).getSize();
    const [w, h] = pageSizePt(declared) ?? [printed.width, printed.height];
    const width = Math.round((w * input.dpi) / 72);
    const height = Math.round((h * input.dpi) / 72);
    const css = { width: (w * 96) / 72, height: (h * 96) / 72 };

    const shotPage = await open(browser, input, html, { ...css, factor: width / css.width });
    const shot = await shotPage.screenshot({ clip: { x: 0, y: 0, ...css } });
    const png = await sharp(shot).resize(width, height, { fit: "fill" }).png().toBuffer();
    const partial = `${input.output}.partial`;
    try {
      writeFileSync(partial, png);
      renameSync(partial, input.output);
    } finally {
      rmSync(partial, { force: true });
    }
    return { width, height };
  } finally {
    await browser.close();
  }
}
