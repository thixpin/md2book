import { chromium, webkit, type Browser, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Served } from "../../src/web/serve.ts";
import { bookHeadings } from "../helpers/fixture-config.ts";
import { DEVICES, contextOptions, ready, serveFixture } from "./helpers.ts";

// Spec 004 User Story 5 / FR-020 / SC-007: in the web reader no page ends with a section heading
// followed by fewer than two lines of its content, in Chromium and WebKit, at the smallest,
// default and largest text sizes, and after the window changes size.
let site: Served;
beforeAll(async () => {
  site = await serveFixture(await bookHeadings());
});
afterAll(async () => {
  await site?.close();
});

/** Headings (not first on their page) with fewer than min(2, all) lines of the next block below. */
function violations(page: Page) {
  return page.evaluate(() => {
    const flow = document.querySelector<HTMLElement>(".reader-flow")!;
    const styles = getComputedStyle(flow);
    const padding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const gap = parseFloat(styles.columnGap);
    const columns = Number(flow.style.columnCount);
    const pitch = (parseFloat(flow.style.width) - padding - (columns - 1) * gap) / columns + gap;
    const found: string[] = [];
    const headings = [...flow.querySelectorAll(".chapter-body :is(h2, h3, h4, h5, h6)")];
    for (const heading of headings) {
      // Pages relative to the heading's column (0 = its page): WebKit's column positions drift
      // from the computed pitch over hundreds of columns.
      const origin = heading.getClientRects()[0]!.left;
      const pageFrom = (rect: DOMRect) => Math.floor((rect.left - origin + 1) / pitch);
      const keys = (rects: DOMRect[]) =>
        new Set(rects.map((rect) => `${pageFrom(rect)}:${Math.round(rect.top)}`)).size;
      const before = heading.previousElementSibling?.getClientRects();
      if (!before?.length || pageFrom(before[before.length - 1]!) !== 0) continue;
      const range = document.createRange();
      range.selectNodeContents(heading.nextElementSibling!);
      const lines = [...range.getClientRects()].filter((rect) => rect.width > 0);
      const here = keys(lines.filter((rect) => pageFrom(rect) === 0));
      if (here < Math.min(2, keys(lines))) found.push(`${heading.textContent} (${here} below)`);
    }
    return { headings: headings.length, found };
  });
}

async function setTextSize(page: Page, clicks: number) {
  for (let i = 0; i < Math.abs(clicks); i++) {
    const open = await page.locator("#reader-text").evaluate((el) => el.matches(":popover-open"));
    if (!open) await page.click('[popovertarget="reader-text"]');
    await page.click(clicks > 0 ? "[data-text-larger]" : "[data-text-smaller]");
    await page.waitForTimeout(250);
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

const phone = DEVICES.find((d) => d.name === "iPhone-class phone")!;
const desktop = DEVICES.find((d) => d.name === "Desktop (mouse)")!;

describe.each([
  ["Chromium", chromium],
  ["WebKit", webkit],
])("web reader headings in %s", (_name, engine) => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await engine.launch();
  });
  afterAll(async () => {
    await browser?.close();
  });

  it.each([phone, desktop])("keeps every heading with 2 lines on $name", async (device) => {
    const context = await browser.newContext({ ...contextOptions(device), isMobile: false });
    const page = await context.newPage();
    await page.goto(`${site.url}chapters/ch01.html`);
    await ready(page);
    // 100%, then the smallest (85%: two steps down), then the largest (150%: four steps up).
    for (const clicks of [0, -2, 6]) {
      await setTextSize(page, clicks);
      const { headings, found } = await violations(page);
      expect(headings).toBe(36);
      expect(found, `text size step ${clicks}`).toEqual([]);
    }
    // After the window changes size (orientation, resize) the pages are laid out again.
    await page.setViewportSize({ width: device.viewport.height, height: device.viewport.width });
    await page.waitForTimeout(800);
    expect((await violations(page)).found, "after resize").toEqual([]);
    await context.close();
  });
});
