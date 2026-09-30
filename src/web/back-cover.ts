import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { chromium } from "playwright";
import type { BookConfig } from "../config/load.ts";
import { BookError } from "../errors.ts";
import { faceFile, type FontFace, type FontSet } from "../fonts/manifest.ts";
import { escapeHtml } from "../manuscript/text.ts";
import type { CoverFacts } from "./images.ts";

const WIDTH = 850;

/**
 * Copies `back_cover`, or renders a plain one in the cover's edge colour with the title near the
 * top and the author near the bottom (reference web.py). A browser engine lays the text out so
 * Myanmar shapes correctly. Returns the file name written into `web`.
 */
export async function writeBackCover(
  config: BookConfig,
  web: string,
  facts: CoverFacts,
  set: FontSet,
  fontsDir: string,
): Promise<string> {
  if (config.back_cover) {
    if (!existsSync(config.back_cover))
      throw new BookError(config.back_cover, "back_cover not found");
    const name = `back-cover${extname(config.back_cover)}`;
    copyFileSync(config.back_cover, join(web, name));
    return name;
  }

  const height = Math.round(WIDTH / facts.ratio);
  const font = (role: FontFace["role"]) => {
    const file = faceFile(set, role);
    return `data:font/ttf;base64,${readFileSync(join(fontsDir, file)).toString("base64")}`;
  };
  const [r, g, b] = facts.edge;
  const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: "Book"; font-weight: 400; src: url("${font("body-regular")}"); }
@font-face { font-family: "Book"; font-weight: 700; src: url("${font("body-bold")}"); }
html, body { margin: 0; width: ${WIDTH}px; height: ${height}px; overflow: hidden;
  background: rgb(${r} ${g} ${b}); color: rgb(244.8 242.25 234.6); font-family: "Book"; }
div { position: absolute; left: ${WIDTH * 0.14}px; width: ${WIDTH * 0.72}px; overflow: hidden; }
.title { top: ${height * 0.08}px; height: ${height * 0.12}px; font-size: 26px; font-weight: 700; }
.author { top: ${height * 0.88}px; height: ${height * 0.07}px; font-size: 18px; }
</style><div class="title">${escapeHtml(config.title)}</div><div class="author">${escapeHtml(config.author)}</div>`;

  let browser;
  try {
    browser = await chromium.launch();
  } catch {
    throw new BookError(
      "back cover",
      "Chromium is not installed; run: npx playwright install chromium",
    );
  }
  try {
    const page = await browser.newPage({
      viewport: { width: WIDTH, height },
      deviceScaleFactor: 1,
    });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(web, "back-cover.png"), type: "png" });
  } finally {
    await browser.close();
  }
  return "back-cover.png";
}
