// Opt-in web analytics: a chapter change in the reader becomes one page view for the provider.
// The providers' scripts are blocked (tests never use the network); the page-view calls are read
// from what md2book queues for them.
import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { BookConfig } from "../../src/config/load.ts";
import type { WebAnalytics } from "../../src/web/analytics.ts";
import type { Served } from "../../src/web/serve.ts";
import { bookHeadings } from "../helpers/fixture-config.ts";
import { DEVICES, contextOptions, launch, ready, serveFixture } from "./helpers.ts";

const PROVIDERS =
  /googletagmanager\.com|plausible\.io|gc\.zgo\.at|goatcounter\.com|cloudflareinsights\.com/;
let browser: Browser;
let base: BookConfig;

beforeAll(async () => {
  base = await bookHeadings();
  browser = await launch();
});
afterAll(async () => {
  await browser?.close();
});

async function reader(
  analytics: WebAnalytics,
  init?: string,
): Promise<{ page: Page; served: Served }> {
  const served = await serveFixture({ ...base, web_analytics: analytics });
  const desktop = DEVICES.find((d) => d.name === "Desktop (mouse)")!;
  const context = await browser.newContext(contextOptions(desktop));
  await context.route(PROVIDERS, (route) => route.abort());
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  await page.goto(`${served.url}chapters/ch01.html`);
  await ready(page);
  return { page, served };
}

/** Opens chapter 2 from the contents, then turns once inside it. */
async function readOn(page: Page) {
  await page.click('[popovertarget="reader-contents"]');
  await page.click('#reader-contents a[data-chapter="ch02"]');
  await page.waitForTimeout(1200);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(900);
}

describe("web analytics", { timeout: 120_000 }, () => {
  it("sends Google Analytics one page_view per chapter change", async () => {
    const { page, served } = await reader({ provider: "google", id: "G-AB12CD34EF" });
    await readOn(page);
    const chapterTitle = await page.getAttribute(
      'section[data-chapter="ch02"]',
      "data-short-title",
    );
    const config = await page.evaluate(() =>
      (window as unknown as { dataLayer: IArguments[] }).dataLayer
        .map((entry) => Array.from(entry) as unknown[])
        .find((entry) => entry[0] === "config"),
    );
    // The page the reader opened at: chapter 1.
    expect(config?.[2]).toEqual(
      expect.objectContaining({ domain: "127.0.0.1", book: base.title, chapter: "ch01" }),
    );
    const views = await page.evaluate(() =>
      (window as unknown as { dataLayer: IArguments[] }).dataLayer
        .map((entry) => Array.from(entry) as unknown[])
        .filter((entry) => entry[0] === "event" && entry[1] === "page_view"),
    );
    expect(views).toEqual([
      [
        "event",
        "page_view",
        expect.objectContaining({
          page_location: `${new URL(served.url).origin}/chapters/ch02.html`,
          domain: "127.0.0.1",
          book: base.title,
          chapter: "ch02",
          chapter_title: chapterTitle,
        }),
      ],
    ]);
    await page.context().close();
    await served.close();
  });

  it("counts the first page and each chapter change in Plausible", async () => {
    const { page, served } = await reader({ provider: "plausible", id: "book.example.com" });
    await readOn(page);
    const queue = await page.evaluate(() =>
      (window as unknown as { plausible: { q: IArguments[] } }).plausible.q.map(
        (entry) => Array.from(entry) as unknown[],
      ),
    );
    const props = (chapter: string): unknown =>
      expect.objectContaining({ domain: "127.0.0.1", book: base.title, chapter });
    expect(queue).toEqual([
      ["pageview", { props: props("ch01") }],
      ["pageview", { u: `${new URL(served.url).origin}/chapters/ch02.html`, props: props("ch02") }],
    ]);
    await page.context().close();
    await served.close();
  });

  it("counts each chapter change in GoatCounter once it has loaded", async () => {
    const stub =
      "window.counted = []; window.goatcounter = { count: (vars) => window.counted.push(vars) };";
    const { page, served } = await reader({ provider: "goatcounter", id: "mybook" }, stub);
    await readOn(page);
    const counted = await page.evaluate(
      () => (window as unknown as { counted: { path: string }[] }).counted,
    );
    expect(counted.map((v) => v.path)).toEqual(["/chapters/ch02.html"]);
    await page.context().close();
    await served.close();
  });

  it("counts no page view while the reader lays the book out, even when fonts arrive late", async () => {
    // On a slow machine the first layout runs before the stylesheet and fonts, and the relayout
    // can move the address through "/" before it settles: that is not a page the reader chose.
    const served = await serveFixture({
      ...base,
      web_analytics: { provider: "goatcounter", id: "mybook" },
    });
    const desktop = DEVICES.find((d) => d.name === "Desktop (mouse)")!;
    const context = await browser.newContext(contextOptions(desktop));
    await context.route(PROVIDERS, (route) => route.abort());
    await context.route(/\.(css|ttf)$/, async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await context.addInitScript(
      "window.counted = []; window.goatcounter = { count: (vars) => window.counted.push(vars) };",
    );
    const page = await context.newPage();
    // As slow as a CI runner.
    await (await context.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: 6 });
    await page.goto(`${served.url}chapters/ch01.html`);
    await page.waitForTimeout(3500);
    const counted = () =>
      page.evaluate(() =>
        (window as unknown as { counted: { path: string }[] }).counted.map((v) => v.path),
      );
    expect(await counted()).toEqual([]);
    await readOn(page);
    expect(await counted()).toEqual(["/chapters/ch02.html"]);
    await context.close();
    await served.close();
  });

  it("keeps reading when the provider's script is blocked", async () => {
    const { page, served } = await reader({
      provider: "cloudflare",
      id: "0123456789abcdef0123456789abcdef",
    });
    const before = await page.textContent("[data-page-indicator]");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(900);
    expect(await page.textContent("[data-page-indicator]")).not.toBe(before);
    await page.context().close();
    await served.close();
  });
});
