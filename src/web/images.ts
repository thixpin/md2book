import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import sharp from "sharp";
import type { BookConfig } from "../config/load.ts";
import { BookError } from "../errors.ts";
import { BOOK_OPEN_PATHS } from "./icons.ts";
import { OG_IMAGE } from "./page.ts";

export interface CoverFacts {
  width: number;
  height: number;
  /** width / height */
  ratio: number;
  /** average RGB of the four edges */
  edge: [number, number, number];
}

/**
 * Cover ratio and average edge colour, sampled like the reference: columns 1 and w-2 every
 * h//40 rows, then rows 1 and h-2 every w//40 columns.
 */
export async function coverFacts(path: string): Promise<CoverFacts> {
  const { data, info } = await sharp(path)
    .toColourspace("srgb")
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;
  // Coordinates are clamped so covers narrower than 3 px still sample inside the image.
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max - 1);
  const pixel = (x: number, y: number) => {
    const i = (clamp(y, h) * w + clamp(x, w)) * channels;
    return [data[i]!, data[i + 1]!, data[i + 2]!];
  };
  const stepY = Math.max(1, Math.floor(h / 40));
  const stepX = Math.max(1, Math.floor(w / 40));
  const samples: number[][] = [];
  for (const x of [1, w - 2]) for (let y = 0; y < h; y += stepY) samples.push(pixel(x, y));
  for (const y of [1, h - 2]) for (let x = 0; x < w; x += stepX) samples.push(pixel(x, y));
  const edge = [0, 1, 2].map(
    (c) => samples.reduce((sum, s) => sum + s[c]!, 0) / samples.length,
  ) as [number, number, number];
  return { width: w, height: h, ratio: w / h, edge };
}

/** Python's round(): halves go to the even neighbour (matches the reference output). */
export function pyRound(value: number): number {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

export function edgeCss(edge: CoverFacts["edge"]): string {
  return `rgb(${edge.map(pyRound).join(" ")})`;
}

/** Share image: the whole cover centred on a 1200×630 card in the cover's edge colour. */
export async function writeOgImage(cover: string, web: string, facts: CoverFacts): Promise<void> {
  const { name, width, height } = OG_IMAGE;
  const coverWidth = Math.round(height * facts.ratio);
  const [r, g, b] = facts.edge.map(pyRound) as [number, number, number];
  const resized = await sharp(cover).resize(coverWidth, height, { fit: "fill" }).png().toBuffer();
  await sharp({ create: { width, height, channels: 3, background: { r, g, b } } })
    .composite([{ input: resized, left: Math.round((width - coverWidth) / 2), top: 0 }])
    .png()
    .toFile(join(web, name));
}

const FAVICON_PNGS = [
  ["favicon-32.png", 32],
  ["apple-touch-icon.png", 180],
] as const;

/** Reader palette ink and paper (web.css), used for the default favicon's glyph. */
const INK = "#202a35";
const PAPER = "#fbfbf9";

const hex = (rgb: number[]) =>
  `#${rgb.map((c) => pyRound(c).toString(16).padStart(2, "0")).join("")}`;

/** WCAG relative luminance of an sRGB colour (0 = black, 1 = white). */
function luminance(rgb: number[]): number {
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Default favicon: an open book on a rounded square in the cover's edge colour. */
export function defaultFaviconSvg(edge: CoverFacts["edge"]): string {
  const glyph = luminance(edge) > 0.5 ? INK : PAPER;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    `<rect width="64" height="64" rx="14" fill="${hex(edge)}"/>` +
    `<g transform="translate(14 14) scale(1.5)" fill="none" stroke="${glyph}" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round">${BOOK_OPEN_PATHS}</g></svg>\n`
  );
}

/**
 * Writes `favicon.svg` and its PNG fallbacks: the configured SVG, or the default open-book icon
 * in the cover's edge colour (spec 002 US-3 #5).
 */
export async function writeFavicons(
  config: BookConfig,
  web: string,
  facts: CoverFacts,
): Promise<void> {
  const svg = join(web, "favicon.svg");
  if (config.web_favicon) {
    if (extname(config.web_favicon) !== ".svg" || !existsSync(config.web_favicon)) {
      throw new BookError(config.web_favicon, "web_favicon must be an existing .svg file");
    }
    copyFileSync(config.web_favicon, svg);
  } else {
    writeFileSync(svg, defaultFaviconSvg(facts.edge));
  }
  for (const [name, size] of FAVICON_PNGS) {
    await sharp(svg, { density: 384 }).resize(size, size).png().toFile(join(web, name));
  }
}
