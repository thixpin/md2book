// Google Analytics behind a consent banner (web_analytics.consent): nothing of Google's loads
// before the reader agrees, the choice is remembered, and it can be changed from the footer.
// Google's script is blocked (tests never use the network); its requests are recorded.
import type { Browser, BrowserContext, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Served } from "../../src/web/serve.ts";
import { bookHeadings } from "../helpers/fixture-config.ts";
import { DEVICES, contextOptions, indicator, launch, ready, serveFixture } from "./helpers.ts";

const ID = "G-AB12CD34EF";
let browser: Browser;
let served: Served;

beforeAll(async () => {
  served = await serveFixture({
    ...(await bookHeadings()),
    web_analytics: { provider: "google", id: ID, consent: true },
  });
  browser = await launch();
});
afterAll(async () => {
  await browser?.close();
  await served?.close();
});

const desktop = DEVICES.find((d) => d.name === "Desktop (mouse)")!;
const phone = DEVICES.find((d) => d.name === "iPhone-class phone")!;

async function reader(
  device = desktop,
): Promise<{ context: BrowserContext; page: Page; google: string[] }> {
  const context = await browser.newContext(contextOptions(device));
  const google: string[] = [];
  await context.route(/googletagmanager\.com/, (route) => {
    google.push(route.request().url());
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(`${served.url}chapters/ch01.html`);
  await ready(page);
  return { context, page, google };
}

const banner = (page: Page) => page.locator(".md2book-consent");
const pageViews = (page: Page) =>
  page.evaluate(() =>
    ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? [])
      .map((entry) => Array.from(entry) as unknown[])
      .filter((entry) => entry[0] === "event" && entry[1] === "page_view"),
  );

async function openChapter2(page: Page) {
  await page.click('[popovertarget="reader-contents"]');
  await page.click('#reader-contents a[data-chapter="ch02"]');
  await page.waitForTimeout(1200);
}

describe("Google Analytics with consent", { timeout: 120_000 }, () => {
  it("asks first and loads nothing of Google's before the reader answers", async () => {
    const { context, page, google } = await reader();
    await expect.poll(() => banner(page).isVisible()).toBe(true);
    // A Myanmar book: the banner speaks Burmese (strings.consent).
    expect(await banner(page).locator("button").allTextContents()).toEqual([
      "ငြင်းပယ်သည်",
      "သဘောတူသည်",
    ]);
    await page.waitForTimeout(800);
    expect(google).toEqual([]);
    expect(await page.evaluate(() => typeof (window as unknown as { gtag?: unknown }).gtag)).toBe(
      "undefined",
    );
    await context.close();
  });

  it("never loads Google Analytics after Decline, and does not ask again", async () => {
    const { context, page, google } = await reader();
    await banner(page).locator('[data-consent="denied"]').click();
    expect(await banner(page).isVisible()).toBe(false);
    await openChapter2(page);
    await page.reload();
    await ready(page);
    expect(await banner(page).count()).toBe(0);
    expect(await page.locator(".footer .md2book-consent-settings").textContent()).toBe(
      "Cookie ဆက်တင်",
    );
    expect(google).toEqual([]);
    await context.close();
  });

  it("loads Google Analytics after Agree, counts chapter changes, and remembers the choice", async () => {
    const { context, page, google } = await reader();
    await banner(page).locator('[data-consent="granted"]').click();
    expect(await banner(page).isVisible()).toBe(false);
    await expect.poll(() => google.length).toBe(1);
    expect(google[0]).toContain(`gtag/js?id=${ID}`);
    await openChapter2(page);
    expect(await pageViews(page)).toEqual([
      [
        "event",
        "page_view",
        expect.objectContaining({
          page_location: `${new URL(served.url).origin}/chapters/ch02.html`,
        }),
      ],
    ]);
    await page.reload();
    await ready(page);
    expect(await banner(page).count()).toBe(0);
    await expect.poll(() => google.length).toBe(2);
    await context.close();
  });

  it("switches Google Analytics off and removes its cookies when the reader changes to Decline", async () => {
    const { context, page } = await reader();
    await banner(page).locator('[data-consent="granted"]').click();
    await page.evaluate(() => {
      document.cookie = "_ga=GA1.1.123; path=/";
      document.cookie = "_ga_AB12CD34EF=GS1.1.456; path=/";
    });
    await page.locator(".footer .md2book-consent-settings").click();
    expect(await banner(page).isVisible()).toBe(true);
    await banner(page).locator('[data-consent="denied"]').click();
    expect(
      await page.evaluate(
        (id) => (window as unknown as Record<string, unknown>)[`ga-disable-${id}`],
        ID,
      ),
    ).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toMatch(/_ga/);
    await openChapter2(page);
    expect(await pageViews(page)).toEqual([]);
    await context.close();
  });

  it("sits above the page controls on a phone, and the book still turns", async () => {
    const { context, page } = await reader(phone);
    const card = (await banner(page).boundingBox())!;
    const controls = (await page.locator(".reader-controls").boundingBox())!;
    expect(card.y + card.height).toBeLessThanOrEqual(controls.y);
    const box = (await page.locator(".reader-window").boundingBox())!;
    const start = await indicator(page);
    await page.touchscreen.tap(box.x + box.width * 0.9, box.y + box.height * 0.3);
    await page.waitForTimeout(700);
    expect(await indicator(page)).not.toBe(start);
    await context.close();
  });
});
