import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Served } from "../../src/web/serve.ts";
import { bookMm } from "../helpers/fixture-config.ts";
import { DEVICES, contextOptions, launch, ready, serveFixture } from "./helpers.ts";

const STEPS = [0.85, 0.92, 1, 1.1, 1.2, 1.35, 1.5];
let browser: Browser;
let site: Served;

beforeAll(async () => {
  site = await serveFixture(await bookMm());
  browser = await launch();
});
afterAll(async () => {
  await browser?.close();
  await site?.close();
});

const desktop = DEVICES.find((d) => d.name === "Desktop (mouse)")!;
const phone = DEVICES.find((d) => d.name === "iPhone-class phone")!;

async function open(device = desktop, init?: string): Promise<Page> {
  const context = await browser.newContext(contextOptions(device));
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  await page.goto(`${site.url}chapters/ch01.html`);
  await ready(page);
  return page;
}

const sizes = (page: Page) =>
  page.evaluate(() => {
    const px = (sel: string) => parseFloat(getComputedStyle(document.querySelector(sel)!).fontSize);
    return {
      p: px(".reader-flow .chapter-body p"),
      h1: px(".reader-flow .chapter-head h1"),
      pre: px(".reader-flow pre.code"),
      terminal: px(".reader-flow .terminal pre"),
      label: document.querySelector("[data-text-size]")!.textContent,
      chapter: location.pathname,
    };
  });

async function step(page: Page, which: "larger" | "smaller") {
  const isOpen = await page.locator("#reader-text").evaluate((el) => el.matches(":popover-open"));
  if (!isOpen) await page.click('[popovertarget="reader-text"]');
  await page.click(`[data-text-${which}]`);
  await page.waitForTimeout(400);
}

describe("text size (SC-008)", () => {
  it("scales text and titles by each step, keeps code sizes, stays in the chapter", async () => {
    const page = await open();
    const base = await sizes(page);
    expect(base.label).toBe("100%");
    for (const scale of STEPS.slice(3)) {
      await step(page, "larger");
      const now = await sizes(page);
      expect(now.p / base.p).toBeCloseTo(scale, 2);
      expect(now.h1 / base.h1).toBeCloseTo(scale, 2);
      expect(now.pre).toBeCloseTo(base.pre, 1);
      expect(now.terminal).toBeCloseTo(base.terminal, 1);
      expect(now.label).toBe(`${Math.round(scale * 100)}%`);
      expect(now.chapter).toBe("/chapters/ch01.html");
    }
    expect(await page.isDisabled("[data-text-larger]")).toBe(true);
    await page.context().close();
  });

  it("goes down to 85% and disables the smaller button there", async () => {
    const page = await open();
    await step(page, "smaller");
    await page.click("[data-text-smaller]");
    await page.waitForTimeout(400);
    expect((await sizes(page)).label).toBe("85%");
    expect(await page.isDisabled("[data-text-smaller]")).toBe(true);
    await page.context().close();
  });

  it("changes size with + and - and restores it after a reload", async () => {
    const page = await open();
    await page.keyboard.press("+");
    await page.waitForTimeout(300);
    await page.keyboard.press("+");
    await page.waitForTimeout(300);
    expect((await sizes(page)).label).toBe("120%");
    await page.keyboard.press("-");
    await page.waitForTimeout(300);
    await page.reload();
    await ready(page);
    expect((await sizes(page)).label).toBe("110%");
    await page.context().close();
  });

  it("still changes size when localStorage is blocked", async () => {
    const block =
      "Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });";
    const page = await open(desktop, block);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await step(page, "larger");
    expect((await sizes(page)).label).toBe("110%");
    expect(errors).toEqual([]);
    await page.context().close();
  });

  it("uses 44 px buttons on touch screens", async () => {
    const page = await open(phone);
    await page.click('[popovertarget="reader-text"]');
    const smallest = await page.evaluate(() =>
      Math.min(
        ...[...document.querySelectorAll("#reader-text button")].map((b) => {
          const r = b.getBoundingClientRect();
          return Math.min(r.width, r.height);
        }),
      ),
    );
    expect(smallest).toBeGreaterThanOrEqual(44);
    await page.context().close();
  });
});
