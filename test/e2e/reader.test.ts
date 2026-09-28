import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Served } from "../../src/web/serve.ts";
import { bookEn, bookMm } from "../helpers/fixture-config.ts";
import {
  DEVICES,
  contextOptions,
  indicator,
  launch,
  ready,
  serveFixture,
  swipe,
} from "./helpers.ts";

let browser: Browser;
let mm: Served;
let en: Served;

beforeAll(async () => {
  mm = await serveFixture(await bookMm());
  en = await serveFixture(await bookEn());
  browser = await launch();
});
afterAll(async () => {
  await browser?.close();
  await mm?.close();
  await en?.close();
});

const desktop = DEVICES.find((d) => d.name === "Desktop (mouse)")!;
const phone = DEVICES.find((d) => d.name === "iPhone-class phone")!;

async function open(url: string, device = desktop, init?: string): Promise<Page> {
  const context = await browser.newContext(contextOptions(device));
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  await page.goto(url);
  await ready(page);
  return page;
}

const isClosed = (page: Page) =>
  page.evaluate(() => document.querySelector("[data-book]")!.classList.contains("is-closed"));

describe("reader behaviour (SC-004)", () => {
  it("starts closed on the cover, opens with → and turns back with ←", async () => {
    const page = await open(mm.url);
    expect(await isClosed(page)).toBe(true);
    expect(await indicator(page)).toBe("Cover");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(1000);
    expect(await isClosed(page)).toBe(false);
    expect(await indicator(page)).toBe("Contents");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(800);
    expect(await indicator(page)).toMatch(/^\d+(–\d+)? \/ \d+$/);
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(800);
    expect(await indicator(page)).toBe("Contents");
    await page.context().close();
  });

  it("turns with the Next and Previous buttons", async () => {
    const page = await open(`${mm.url}chapters/ch01.html`);
    const before = await indicator(page);
    await page.click("[data-page-next]");
    await page.waitForTimeout(800);
    expect(await indicator(page)).not.toBe(before);
    await page.click("[data-page-previous]");
    await page.waitForTimeout(800);
    expect(await indicator(page)).toBe(before);
    await page.context().close();
  });

  it("turns forward and back with one swipe each on a phone", async () => {
    const page = await open(`${mm.url}chapters/ch01.html`, phone);
    const start = await indicator(page);
    const y = 400;
    await swipe(page, 330, 60, y);
    await page.waitForTimeout(800);
    const next = await indicator(page);
    expect(next).not.toBe(start);
    await swipe(page, 60, 330, y);
    await page.waitForTimeout(800);
    expect(await indicator(page)).toBe(start);
    await page.context().close();
  });

  it("follows the chapter in the address and title without adding history", async () => {
    const page = await open(mm.url);
    const length = await page.evaluate(() => history.length);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(1000);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(800);
    expect(new URL(page.url()).pathname).toBe("/chapters/ch01.html");
    expect(await page.title()).toMatch(/ \| /);
    expect(await page.evaluate(() => history.length)).toBe(length);
    await page.context().close();
  });

  it("restores the last position on return and bookmarks the page", async () => {
    const page = await open(mm.url);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(1000);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(800);
    const where = await indicator(page);
    await page.click("[data-bookmark-toggle]");
    expect(await page.getAttribute("[data-bookmark-toggle]", "aria-pressed")).toBe("true");
    await page.reload();
    await ready(page);
    await page.waitForTimeout(1000);
    expect(await indicator(page)).toBe(where);
    expect(await page.getAttribute("[data-bookmark-toggle]", "aria-pressed")).toBe("true");
    // The reader fills the bookmark list when the Contents panel opens.
    await page.click('[popovertarget="reader-contents"]');
    await page.waitForSelector("[data-bookmark-list] li", { timeout: 5000 });
    expect(await page.locator("[data-bookmark-list] li").count()).toBe(1);
    await page.context().close();
  });

  it("keeps reading when localStorage is blocked", async () => {
    const block =
      "Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });";
    const page = await open(mm.url, desktop, block);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(1000);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(800);
    await page.click("[data-bookmark-toggle]");
    expect(await indicator(page)).toMatch(/\//);
    expect(errors).toEqual([]);
    await page.context().close();
  });

  it("searches the book and jumps to a result", async () => {
    const page = await open(`${mm.url}chapters/ch01.html`);
    await page.click('[popovertarget="reader-search"]');
    await page.fill("[data-search-input]", "ဒုတိယ");
    await page.waitForTimeout(400);
    const results = page.locator("[data-search-results] li");
    expect(await results.count()).toBeGreaterThan(0);
    expect(await results.count()).toBeLessThanOrEqual(30);
    await results.first().locator("a, button").first().click();
    await page.waitForTimeout(800);
    expect(await page.locator("#reader-search").evaluate((el) => el.matches(":popover-open"))).toBe(
      false,
    );
    await page.context().close();
  });

  it("turns instantly under prefers-reduced-motion", async () => {
    const context = await browser.newContext({
      ...contextOptions(desktop),
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(`${mm.url}chapters/ch01.html`);
    await ready(page);
    const before = await indicator(page);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(120);
    expect(await indicator(page)).not.toBe(before);
    await context.close();
  });

  it("prints ASCII folios in an English book", async () => {
    const page = await open(`${en.url}chapters/ch01.html`);
    const folios = await page.$$eval("[data-page-number]:not([hidden])", (els) =>
      els.map((el) => el.textContent ?? ""),
    );
    expect(folios.join("")).toMatch(/^[0-9]+$/);
    await page.context().close();
  });

  it("paginates the same when the stylesheet and fonts arrive late", async () => {
    const normal = await open(`${mm.url}chapters/ch01.html`);
    const expected = await indicator(normal);
    await normal.context().close();

    const context = await browser.newContext(contextOptions(desktop));
    await context.route(/\.(css|ttf)$/, async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    const slow = await context.newPage();
    await slow.goto(`${mm.url}chapters/ch01.html`);
    await slow.waitForTimeout(3500);
    expect(await indicator(slow)).toBe(expected);
    await context.close();
  });

  it("keeps the text findable with browser Find", async () => {
    const page = await open(`${mm.url}chapters/ch01.html`);
    expect(
      await page.evaluate(() => (window as unknown as { find(s: string): boolean }).find("ဒုတိယ")),
    ).toBe(true);
    await page.context().close();
  });
});
