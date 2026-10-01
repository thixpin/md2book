// The closed back cover on a phone (one page) is seen from the back: spine and hinge on the right.
import type { Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Served } from "../../src/web/serve.ts";
import { bookHeadings } from "../helpers/fixture-config.ts";
import { DEVICES, contextOptions, launch, ready, serveFixture } from "./helpers.ts";

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

describe("the back cover on a phone", { timeout: 120_000 }, () => {
  it("has its spine shadow and hinge on the right, like a book turned over", async () => {
    const phone = DEVICES.find((d) => d.name === "iPhone-class phone")!;
    const context = await browser.newContext(contextOptions(phone));
    const page = await context.newPage();
    await page.goto(served.url);
    await ready(page);
    await expect
      .poll(
        async () => {
          await page.keyboard.press("End");
          await page.keyboard.press("ArrowRight");
          return page.locator(".book.is-single.show-back-cover").count();
        },
        { timeout: 30_000, interval: 300 },
      )
      .toBe(1);
    const style = await page.evaluate(() => {
      const back = document.querySelector(".book-back-cover")!;
      return {
        shadow: getComputedStyle(back).boxShadow,
        hinge: getComputedStyle(back, "::after").backgroundImage,
      };
    });
    // The spine shadow is inset from the right edge (negative x offset); the hinge gradient
    // starts at the right.
    expect(style.shadow).toMatch(/-7px 0px 9px -6px inset/);
    expect(style.hinge).toMatch(/^linear-gradient\(to left/);
    await context.close();
  });
});
