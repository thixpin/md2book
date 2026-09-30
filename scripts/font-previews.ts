// Maintainer tool: renders the font previews in docs/images/fonts/ (docs/fonts.md) from each font
// set's real files, the way the PDF edition sets them: Chromium prints a one-page PDF and pdf.js
// rasterises it. (A Chromium screenshot would not show the synthesised bold of a set without a
// bold face, which the PDF does.)
//   node scripts/font-previews.ts
// Fonts come from MD2BOOK_FONTS_SOURCE when set, else build/fonts (scripts/build-fonts.py), else
// the published font release.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { chromium } from "playwright";
import { runFonts } from "../src/fonts/command.ts";
import { loadManifest, type FontSet } from "../src/fonts/manifest.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "docs", "images", "fonts");
const DPI = 150;

// The classic Myanmar pangram: every consonant of the alphabet in one sentence.
const MYANMAR =
  "သီဟိုဠ်မှ ဉာဏ်ကြီးရှင်သည် အာယုဝဍ္ဎနဆေးညွှန်းစာကို ဇလွန်ဈေးဘေး ဗာဒံပင်ထက် အဓိဋ္ဌာန်လျက် ဂဃနဏဖတ်ခဲ့သည်။";
const LATIN = "The quick brown fox jumps over the lazy dog. 0123456789";

/** The set's body faces under its family name, as the book stylesheets declare them. */
function fontFaces(set: FontSet): string {
  return set.faces
    .filter((face) => face.role.startsWith("body-"))
    .map(
      (face) =>
        `@font-face { font-family: "${set.body_family}"; font-weight: ${face.weight}; ` +
        `font-style: ${face.italic ? "italic" : "normal"}; src: url("${face.file}"); }`,
    )
    .join("\n");
}

function html(set: FontSet): string {
  const myanmar = set.language === "my";
  return `<!doctype html>
<html lang="${myanmar ? "my" : "en"}"><head><meta charset="utf-8"><style>
${fontFaces(set)}
html, body { margin: 0; }
body { padding: 5mm 6mm 4mm; background: #fbfbf9; color: #202a35;
  font-family: "${set.body_family}", sans-serif; }
.name { margin: 0 0 2mm; color: #0b6670; font-size: 9pt; font-weight: 700; letter-spacing: .03em; }
p { margin: 0 0 1.4mm; font-size: 11.5pt; line-height: 1.55; }
p:last-child { margin: 0; }
.bold { font-weight: 700; }
.latin { color: #52606d; font-size: 10pt; }
</style></head><body>
<p class="name">${set.body_family}</p>
${
  myanmar
    ? `<p>${MYANMAR}</p><p class="bold">${MYANMAR}</p><p class="latin">${LATIN}</p>`
    : `<p>${LATIN}</p><p class="bold">${LATIN}</p>`
}
</body></html>`;
}

/** Page 1 of a PDF as a PNG. */
async function rasterise(
  pdfFile: string,
  pngFile: string,
): Promise<{ width: number; height: number }> {
  const task = getDocument({ data: new Uint8Array(readFileSync(pdfFile)), verbosity: 0 });
  try {
    const page = await (await task.promise).getPage(1);
    const viewport = page.getViewport({ scale: DPI / 72 });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    await page.render({
      canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise;
    writeFileSync(pngFile, canvas.toBuffer("image/png"));
    return { width: canvas.width, height: canvas.height };
  } finally {
    await task.destroy();
  }
}

if (!process.env.MD2BOOK_FONTS_SOURCE && existsSync(join(ROOT, "build", "fonts"))) {
  process.env.MD2BOOK_FONTS_SOURCE = join(ROOT, "build", "fonts");
}
const work = mkdtempSync(join(tmpdir(), "md2book-previews-"));
const browser = await chromium.launch();
try {
  mkdirSync(OUT, { recursive: true });
  const manifest = await loadManifest();
  for (const set of Object.values(manifest.sets)) {
    const { dir } = await runFonts({ set: set.id, fontsDir: join(work, "fonts") });
    const folder = join(work, set.id);
    mkdirSync(folder);
    for (const face of set.faces) copyFileSync(join(dir, face.file), join(folder, face.file));
    writeFileSync(join(folder, "preview.html"), html(set));
    // The page's width (170 mm at 96 px/in), so the text wraps as it will print.
    const page = await browser.newPage({ viewport: { width: 643, height: 200 } });
    await page.goto(pathToFileURL(join(folder, "preview.html")).href);
    await page.evaluate(() => document.fonts.ready);
    // One page exactly as tall as the text.
    const height = await page.evaluate(() =>
      Math.ceil(document.body.getBoundingClientRect().height),
    );
    await page.pdf({
      path: join(folder, "preview.pdf"),
      width: "170mm",
      height: `${height + 1}px`,
      printBackground: true,
      pageRanges: "1",
    });
    await page.close();
    const size = await rasterise(join(folder, "preview.pdf"), join(OUT, `${set.id}.png`));
    console.log(`${set.id}: docs/images/fonts/${set.id}.png (${size.width} x ${size.height} px)`);
  }
} finally {
  await browser.close();
  rmSync(work, { recursive: true, force: true });
}
