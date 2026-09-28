import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContextOptions, type Page } from "playwright";
import type { BookConfig } from "../../src/config/load.ts";
import { buildWeb } from "../../src/web/build.ts";
import { serveDir, type Served } from "../../src/web/serve.ts";
import { FIXTURE_MANIFEST } from "../helpers/fonts.ts";
import { FIXTURE_FONTS } from "../helpers/fonts.ts";
import { fetchFontSet } from "../../src/fonts/fetch.ts";
import { getFontSet, loadManifest } from "../../src/fonts/manifest.ts";

/**
 * Builds a fixture book's web edition and serves it on a random local port. The files live in
 * their own temp dir (not the per-test `tempDir()` helper, which is emptied after each test) and
 * are removed by `close()`.
 */
export async function serveFixture(config: BookConfig): Promise<Served> {
  const root = mkdtempSync(join(tmpdir(), "md2book-e2e-"));
  const manifest = await loadManifest(FIXTURE_MANIFEST);
  process.env.MD2BOOK_FONTS_SOURCE = FIXTURE_FONTS;
  const set = getFontSet(manifest, config.language, config.font_set);
  await fetchFontSet(set, { fontsDir: join(root, "fonts"), manifest });
  const { dir } = await buildWeb(config, {
    out: join(root, "book"),
    fontsDir: join(root, "fonts"),
    manifestPath: FIXTURE_MANIFEST,
  });
  const served = await serveDir(dir, 0);
  return {
    ...served,
    close: async () => {
      await served.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

export interface Device {
  name: string;
  viewport: { width: number; height: number };
  touch: boolean;
  pages: 1 | 2;
  /** Phones use the whole screen; tablets and unfolded foldables the 170:240 page. */
  fullScreen?: boolean;
}

// Reference device matrix (REF §10). The Surface Duo spanning case needs viewport-segment
// emulation, which Chromium automation does not offer; it is covered by the CSS media query only.
export const DEVICES: Device[] = [
  {
    name: "iPhone-class phone",
    viewport: { width: 390, height: 844 },
    touch: true,
    pages: 1,
    fullScreen: true,
  },
  { name: "iPad mini portrait", viewport: { width: 744, height: 1133 }, touch: true, pages: 1 },
  { name: "iPad Air portrait", viewport: { width: 820, height: 1180 }, touch: true, pages: 1 },
  { name: "iPad Pro 11 portrait", viewport: { width: 834, height: 1194 }, touch: true, pages: 1 },
  { name: "iPad Pro 13 portrait", viewport: { width: 1024, height: 1366 }, touch: true, pages: 1 },
  { name: "iPad Air landscape", viewport: { width: 1180, height: 820 }, touch: true, pages: 2 },
  { name: "iPad Pro 13 landscape", viewport: { width: 1366, height: 1024 }, touch: true, pages: 2 },
  {
    name: "Z Fold folded",
    viewport: { width: 344, height: 882 },
    touch: true,
    pages: 1,
    fullScreen: true,
  },
  {
    name: "Z Fold unfolded portrait",
    viewport: { width: 884, height: 1104 },
    touch: true,
    pages: 1,
  },
  {
    name: "Z Fold unfolded landscape",
    viewport: { width: 1104, height: 884 },
    touch: true,
    pages: 2,
  },
  { name: "Desktop (mouse)", viewport: { width: 1440, height: 900 }, touch: false, pages: 2 },
];

export function contextOptions(device: Device): BrowserContextOptions {
  return {
    viewport: device.viewport,
    deviceScaleFactor: 2,
    hasTouch: device.touch,
    isMobile: device.touch,
  };
}

export async function launch(): Promise<Browser> {
  return chromium.launch();
}

export const indicator = (page: Page) =>
  page
    .locator("[data-page-indicator]")
    .textContent()
    .then((t) => t ?? "");

/** Waits until the reader has laid the book out (page indicator filled in). */
export async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector("[data-page-indicator]")?.textContent);
  await page.waitForTimeout(300);
}

/** A horizontal touch swipe through the Chrome DevTools protocol (Playwright has no touch drag). */
export async function swipe(page: Page, fromX: number, toX: number, y: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const steps = 8;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: fromX, y }],
  });
  for (let i = 1; i <= steps; i++) {
    const x = fromX + ((toX - fromX) * i) / steps;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
