// A site served under a path, as GitHub project Pages serve https://<owner>.github.io/<repo>/:
// the reader loads its files there and keeps the address inside it.
import type { Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Served } from "../../src/web/serve.ts";
import { bookHeadings } from "../helpers/fixture-config.ts";
import { DEVICES, contextOptions, launch, ready, serveFixture } from "./helpers.ts";

let browser: Browser;
let served: Served;

beforeAll(async () => {
  served = await serveFixture({
    ...(await bookHeadings()),
    web_url: "https://owner.github.io/my-book/",
  });
  browser = await launch();
});
afterAll(async () => {
  await browser?.close();
  await served?.close();
});

describe("a site under a path (GitHub project Pages)", { timeout: 60_000 }, () => {
  it("reads the book and moves the address within the site's path", async () => {
    expect(served.url).toMatch(/\/my-book\/$/);
    const desktop = DEVICES.find((d) => d.name === "Desktop (mouse)")!;
    const context = await browser.newContext(contextOptions(desktop));
    const failed: string[] = [];
    context.on("response", (r) => {
      if (r.status() >= 400) failed.push(r.url());
    });
    const page = await context.newPage();
    await page.goto(`${served.url}chapters/ch01.html`);
    await ready(page);
    await page.evaluate(() => ((window as unknown as { marker: boolean }).marker = true));

    await page.click('[popovertarget="reader-contents"]');
    await page.click('#reader-contents a[data-chapter="ch02"]');
    await page.waitForTimeout(1200);
    expect(new URL(page.url()).pathname).toBe("/my-book/chapters/ch02.html");

    await page.click("[data-home]");
    await page.waitForTimeout(1200);
    expect(new URL(page.url()).pathname).toBe("/my-book/");
    // Turned inside the page, never loaded again.
    expect(await page.evaluate(() => (window as unknown as { marker?: boolean }).marker)).toBe(
      true,
    );
    expect(failed).toEqual([]);
    await context.close();
  });
});
