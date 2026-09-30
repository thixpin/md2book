// The book's `running` layout in the web reader: mirrored inner and outer parts on left and right
// pages, and a center part in the middle of the page.
import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Served } from "../../src/web/serve.ts";
import type { BookConfig } from "../../src/config/load.ts";
import { bookHeadings } from "../helpers/fixture-config.ts";
import { DEVICES, contextOptions, launch, ready, serveFixture } from "./helpers.ts";

let browser: Browser;
let served: Served;
let config: BookConfig;

beforeAll(async () => {
  config = await bookHeadings();
  served = await serveFixture({
    ...config,
    running: {
      top: { inner: "author", center: "book-title", outer: "chapter-title" },
      bottom: { inner: "none", center: "page-number", outer: "none" },
    },
  });
  browser = await launch();
});
afterAll(async () => {
  await browser?.close();
  await served?.close();
});

interface Line {
  side: string;
  parts: { cls: string; text: string; centre: number }[];
  centre: number;
}

/** The visible heads or feet: their parts in DOM order and horizontal centres. */
const lines = (page: Page, selector: string) =>
  page.evaluate((s) => {
    const mid = (el: Element) => {
      const r = el.getBoundingClientRect();
      return (r.left + r.right) / 2;
    };
    return [...document.querySelectorAll(s)]
      .filter((el) => !(el as HTMLElement).hidden)
      .map((el) => ({
        side: (el as HTMLElement).dataset.pageHead ?? (el as HTMLElement).dataset.pageNumber ?? "",
        parts: [...el.children].map((c) => ({
          cls: c.className,
          text: c.textContent ?? "",
          centre: mid(c),
        })),
        centre: mid(el),
      }));
  }, selector);

describe("running heads and feet in the reader", { timeout: 60_000 }, () => {
  it("mirrors inner and outer on left and right pages and centres the center part", async () => {
    const desktop = DEVICES.find((d) => d.name === "Desktop (mouse)")!;
    const page = await (await browser.newContext(contextOptions(desktop))).newPage();
    await page.goto(`${served.url}chapters/ch01.html`);
    await ready(page);
    const seen = { head: new Set<string>(), foot: new Set<string>() };
    for (let turn = 0; turn < 4; turn++) {
      for (const [kind, selector] of [
        ["head", "[data-page-head]"],
        ["foot", "[data-page-number]"],
      ] as const) {
        for (const line of (await lines(page, selector)) as Line[]) {
          seen[kind].add(line.side);
          const order = line.parts.map((p) => p.cls);
          expect(order, `${kind} ${line.side}`).toEqual(
            line.side === "left"
              ? ["outside", "center", "inside"]
              : ["inside", "center", "outside"],
          );
          const text = Object.fromEntries(line.parts.map((p) => [p.cls, p.text]));
          if (kind === "head") {
            expect(text.inside).toBe(config.author);
            expect(text.center).toBe(config.title);
            expect(text.outside).not.toBe("");
          } else {
            expect(text.inside).toBe("");
            expect(text.outside).toBe("");
            expect(text.center).toMatch(/^[0-9၀-၉]+$/);
          }
          const centre = line.parts.find((p) => p.cls === "center")!.centre;
          expect(Math.abs(centre - line.centre), `${kind} ${line.side} centred`).toBeLessThan(2);
        }
      }
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(700);
    }
    // Both page sides were checked for heads and feet.
    expect([...seen.head].sort()).toEqual(["left", "right"]);
    expect([...seen.foot].sort()).toEqual(["left", "right"]);
    await page.context().close();
  });
});
