// Page turns by touch on phones, through Chromium's real touch pipeline (CDP touch events go
// through touch-action and gesture detection, which DevTools' mouse emulation does not).
import type { Browser, BrowserContext, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Served } from "../../src/web/serve.ts";
import { bookHeadings } from "../helpers/fixture-config.ts";
import { DEVICES, contextOptions, indicator, launch, ready, serveFixture } from "./helpers.ts";

let browser: Browser;
let served: Served;

beforeAll(async () => {
  served = await serveFixture(await bookHeadings());
  browser = await launch();
});
afterAll(async () => {
  await browser?.close();
  await served?.close();
});

const phone = DEVICES.find((d) => d.name === "iPhone-class phone")!;
const desktop = DEVICES.find((d) => d.name === "Desktop (mouse)")!;

async function open(device: typeof phone): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext(contextOptions(device));
  const page = await context.newPage();
  await page.goto(`${served.url}chapters/ch02.html`);
  await ready(page);
  return { context, page };
}

const bookBox = async (page: Page) => (await page.locator(".reader-window").boundingBox())!;

/** A touch gesture along `points` ([x, y] in the page), one move per frame. */
async function gesture(page: Page, points: [number, number][], frameMs = 16): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const [first, ...rest] = points;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: first![0], y: first![1] }],
  });
  for (const [x, y] of rest) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    await page.waitForTimeout(frameMs);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

/** A thumb's swipe: it curves, and starts more downward than sideways (about 55° from flat). */
function thumbArc(fromX: number, toX: number, y: number, steps = 12): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [fromX + (toX - fromX) * t, y + 150 * Math.sin((t * Math.PI) / 2)] as [number, number];
  });
}

const settle = (page: Page) => page.waitForTimeout(700);

describe("turning pages by touch on a phone", { timeout: 120_000 }, () => {
  it("keeps every swipe for the book while the page has nothing to scroll", async () => {
    const { context, page } = await open(phone);
    expect(await page.locator(".reader-window.is-swipe-only").count()).toBe(1);
    await context.close();
    const mouse = await open(desktop);
    expect(await mouse.page.locator(".reader-window.is-swipe-only").count()).toBe(0);
    await mouse.context.close();
  });

  it("turns on a slanted thumb swipe, forward and back", async () => {
    const { context, page } = await open(phone);
    const box = await bookBox(page);
    const y = box.y + box.height * 0.35;
    const start = await indicator(page);
    await gesture(page, thumbArc(box.x + box.width * 0.8, box.x + box.width * 0.25, y));
    await settle(page);
    const next = await indicator(page);
    expect(next).not.toBe(start);
    await gesture(page, thumbArc(box.x + box.width * 0.25, box.x + box.width * 0.8, y));
    await settle(page);
    expect(await indicator(page)).toBe(start);
    await context.close();
  });

  it("turns on a short, quick swipe", async () => {
    const { context, page } = await open(phone);
    const box = await bookBox(page);
    const y = box.y + box.height / 2;
    const start = await indicator(page);
    const x = box.x + box.width * 0.6;
    await gesture(
      page,
      [0, 1, 2, 3, 4, 5].map((i) => [x - i * 12, y] as [number, number]),
      12,
    );
    await settle(page);
    expect(await indicator(page)).not.toBe(start);
    await context.close();
  });

  it("does not turn on a vertical swipe", async () => {
    const { context, page } = await open(phone);
    const box = await bookBox(page);
    const x = box.x + box.width / 2;
    const start = await indicator(page);
    const points = Array.from(
      { length: 10 },
      (_, i) => [x + i * 2, box.y + 200 + i * 25] as [number, number],
    );
    await gesture(page, points);
    await settle(page);
    expect(await indicator(page)).toBe(start);
    await context.close();
  });

  it("turns twice on two quick swipes, the second during the first turn", async () => {
    const { context, page } = await open(phone);
    const box = await bookBox(page);
    const y = box.y + box.height / 2;
    const swipe = [0, 1, 2, 3, 4, 5, 6].map(
      (i) => [box.x + box.width * 0.8 - i * 30, y] as [number, number],
    );
    const pages: string[] = [await indicator(page)];
    await gesture(page, swipe, 10);
    await page.waitForTimeout(60);
    await gesture(page, swipe, 10);
    await settle(page);
    pages.push(await indicator(page));
    await page.keyboard.press("ArrowLeft");
    await settle(page);
    await page.keyboard.press("ArrowLeft");
    await settle(page);
    expect(await indicator(page)).toBe(pages[0]);
    expect(pages[1]).not.toBe(pages[0]);
    await context.close();
  });

  it("turns on a tap at the right or left edge, on the text too, and not in the middle", async () => {
    const { context, page } = await open(phone);
    const box = await bookBox(page);
    const y = box.y + box.height * 0.4;
    const start = await indicator(page);
    await page.touchscreen.tap(box.x + box.width / 2, y);
    await settle(page);
    expect(await indicator(page)).toBe(start);
    // On a line of text, not the page's padding.
    const onText = await page.evaluate(
      ([x, y]) => !document.elementFromPoint(x!, y!)?.classList.contains("reader-window"),
      [box.x + box.width * 0.9, y],
    );
    expect(onText).toBe(true);
    await page.touchscreen.tap(box.x + box.width * 0.9, y);
    await settle(page);
    const next = await indicator(page);
    expect(next).not.toBe(start);
    await page.touchscreen.tap(box.x + box.width * 0.1, y);
    await settle(page);
    expect(await indicator(page)).toBe(start);
    await context.close();
  });

  it("does not turn on a tap that only clears a text selection", async () => {
    const { context, page } = await open(phone);
    const box = await bookBox(page);
    const start = await indicator(page);
    await page.evaluate(() => {
      const text = document.querySelector(".chapter-body p")!;
      window.getSelection()!.selectAllChildren(text);
    });
    await page.touchscreen.tap(box.x + box.width * 0.9, box.y + box.height * 0.4);
    await settle(page);
    expect(await indicator(page)).toBe(start);
    await context.close();
  });
});

describe("desktop is unchanged", { timeout: 60_000 }, () => {
  it("does not turn when the mouse clicks the text near the edge", async () => {
    const { context, page } = await open(desktop);
    const box = await bookBox(page);
    const start = await indicator(page);
    const point = await page.evaluate(() => {
      const r = document.querySelector(".chapter-body p")!.getBoundingClientRect();
      return { x: r.left + 4, y: r.top + 6 };
    });
    expect(point.x).toBeLessThan(box.x + box.width * 0.25);
    await page.mouse.click(point.x, point.y);
    await settle(page);
    expect(await indicator(page)).toBe(start);
    await context.close();
  });
});
