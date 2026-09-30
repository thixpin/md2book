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
    expect(queue).toEqual([
      ["pageview"],
      ["pageview", { u: `${new URL(served.url).origin}/chapters/ch02.html` }],
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
