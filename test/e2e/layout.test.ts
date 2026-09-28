import type { Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Served } from "../../src/web/serve.ts";
import { bookMm } from "../helpers/fixture-config.ts";
import { DEVICES, contextOptions, launch, ready } from "./helpers.ts";

let browser: Browser;
let site: Served;

beforeAll(async () => {
  site = await serveFixture();
  browser = await launch();
});
afterAll(async () => {
  await browser?.close();
  await site?.close();
});

async function serveFixture() {
  const { serveFixture: serve } = await import("./helpers.ts");
  return serve(await bookMm());
}

describe("device matrix (SC-003)", () => {
  for (const device of DEVICES) {
    it(`${device.name}: ${device.pages === 2 ? "spread" : "one page"}, controls fit`, async () => {
      const context = await browser.newContext(contextOptions(device));
      const page = await context.newPage();
      await page.goto(`${site.url}chapters/ch01.html`);
      await ready(page);

      const layout = await page.evaluate(() => {
        const book = document.querySelector<HTMLElement>("[data-book]")!;
        const r = book.getBoundingClientRect();
        const controls = document.querySelector(".reader-controls")!.getBoundingClientRect();
        const targets = [...document.querySelectorAll<HTMLElement>(".reader-tool, .page-turn")]
          .filter((el) => !el.hidden && el.offsetParent !== null)
          .map((el) => el.getBoundingClientRect())
          .map((b) => Math.min(b.width, b.height));
        return {
          single: book.classList.contains("is-single"),
          ratio: r.width / r.height,
          centre: r.left + r.width / 2,
          controls: [controls.left, controls.right, controls.top, controls.bottom],
          scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          smallestTarget: Math.min(...targets),
          viewport: [window.innerWidth, window.innerHeight],
        };
      });
      const [vw, vh] = layout.viewport as [number, number];
      expect(layout.single).toBe(device.pages === 1);
      if (device.pages === 2) {
        expect(layout.ratio).toBeCloseTo(1.4167, 1);
        expect(Math.abs(layout.centre - vw / 2)).toBeLessThanOrEqual(2);
      } else if (!device.fullScreen) {
        expect(layout.ratio).toBeCloseTo(170 / 240, 1);
      }
      const [left, right, top, bottom] = layout.controls as [number, number, number, number];
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(vw);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(vh);
      expect(layout.scroll).toBeLessThanOrEqual(0);
      if (device.touch) expect(layout.smallestTarget).toBeGreaterThanOrEqual(44);
      await context.close();
    });
  }
});
