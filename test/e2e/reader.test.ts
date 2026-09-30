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

describe("loading screen", () => {
  const visibility = (page: Page, selector: string) =>
    page.evaluate((s) => getComputedStyle(document.querySelector(s)!).visibility, selector);

  async function withoutReader(): Promise<Page> {
    const page = await (await browser.newContext(contextOptions(desktop))).newPage();
    await page.route(/reader\.[0-9a-f]+\.js$/, (route) => route.abort());
    await page.goto(`${mm.url}chapters/ch01.html`);
    await page.waitForTimeout(300);
    return page;
  }

  it("shows only the cover until the reader has laid out the book", async () => {
    const page = await withoutReader();
    expect(await visibility(page, "[data-reader-loading]")).toBe("visible");
    const box = await page.locator(".reader-loading-cover").boundingBox();
    expect(box!.width).toBeGreaterThan(100);
    expect(await visibility(page, ".reader-window")).toBe("hidden");
    expect(await visibility(page, ".reader-controls")).toBe("hidden");
    await page.context().close();
  });

  it("fades the loading cover out with a blur after the first layout", async () => {
    const page = await open(`${mm.url}chapters/ch01.html`);
    const classes = await page.evaluate(() => [
      ...document.querySelector("[data-reader]")!.classList,
    ]);
    expect(classes).not.toContain("is-loading");
    expect(classes).toContain("is-ready");
    await page.waitForTimeout(600);
    const style = await page.evaluate(() => {
      const s = getComputedStyle(document.querySelector("[data-reader-loading]")!);
      return { property: s.transitionProperty, opacity: s.opacity, filter: s.filter };
    });
    expect(style.property).toContain("opacity");
    expect(style.property).toContain("filter");
    expect(style.opacity).toBe("0");
    expect(style.filter).toContain("blur");
    expect(await page.locator("[data-reader-loading]").isVisible()).toBe(false);
    expect(await visibility(page, ".reader-window")).toBe("visible");
    await page.context().close();
  });

  it("shows the book anyway if the reader script never runs", async () => {
    const page = await withoutReader();
    await page.waitForTimeout(8_500);
    expect(await visibility(page, ".reader-window")).toBe("visible");
    expect(await visibility(page, "[data-reader-loading]")).toBe("hidden");
    await page.context().close();
  });
});

describe("toolbar panels", () => {
  const rects = (page: Page, id: string) =>
    page.evaluate((panelId) => {
      const box = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      };
      return {
        button: box(document.querySelector(`[popovertarget="${panelId}"]`)!),
        panel: box(document.getElementById(panelId)!),
        width: window.innerWidth,
      };
    }, id);

  for (const device of [desktop, phone]) {
    it(`opens each panel just below its toolbar button (${device.name})`, async () => {
      const page = await open(`${mm.url}chapters/ch01.html`, device);
      for (const id of ["reader-contents", "reader-search", "reader-text"]) {
        await page.click(`[popovertarget="${id}"]`);
        await page.waitForTimeout(300); // after the opening transition
        const { button, panel, width } = await rects(page, id);
        expect(panel.top, id).toBeGreaterThanOrEqual(button.bottom);
        expect(panel.top - button.bottom, id).toBeLessThan(16);
        expect(panel.left, id).toBeGreaterThanOrEqual(0);
        expect(panel.right, id).toBeLessThanOrEqual(width);
        // Under its button: right-aligned with it when there is room, otherwise kept in the window.
        const centre = (button.left + button.right) / 2;
        expect(centre, id).toBeGreaterThanOrEqual(panel.left);
        expect(centre, id).toBeLessThanOrEqual(panel.right);
        // The text size panel is set 14 px to the right of its button (visual balance).
        const shift = id === "reader-text" ? 14 : 0;
        if (panel.left > 8)
          expect(
            Math.abs(panel.right - Math.min(button.right + shift, width - 8)),
            id,
          ).toBeLessThan(2);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);
      }
      await page.context().close();
    });
  }

  it("draws every panel as rounded glass with a pointer at its button", async () => {
    const page = await open(`${mm.url}chapters/ch01.html`);
    for (const id of ["reader-contents", "reader-search", "reader-text"]) {
      await page.click(`[popovertarget="${id}"]`);
      await page.waitForTimeout(250);
      const look = await page.evaluate((panelId) => {
        const panel = document.getElementById(panelId)!;
        const style = getComputedStyle(panel);
        const pointer = getComputedStyle(panel, "::before");
        const button = document
          .querySelector(`[popovertarget="${panelId}"]`)!
          .getBoundingClientRect();
        const box = panel.getBoundingClientRect();
        return {
          radius: parseFloat(style.borderTopLeftRadius),
          backdrop:
            style.backdropFilter ||
            (style as unknown as { webkitBackdropFilter: string }).webkitBackdropFilter,
          background: style.backgroundColor,
          shadow: style.boxShadow,
          pointer: pointer.content,
          pointerX: box.left + parseFloat(pointer.left),
          buttonX: (button.left + button.right) / 2,
          body: panel.firstElementChild?.classList.contains("reader-panel-body"),
        };
      }, id);
      expect(look.radius, id).toBeGreaterThanOrEqual(10);
      expect(look.backdrop, id).toContain("blur");
      expect(look.background, id).toMatch(
        /rgba?\(.*\/ 0\.\d+\)|rgba\(.*, 0\.\d+\)|color\(srgb .* \/ 0\.\d+\)/,
      );
      expect(look.shadow, id).not.toBe("none");
      expect(look.pointer, id).not.toBe("none");
      expect(Math.abs(look.pointerX - look.buttonX), id).toBeLessThan(2);
      expect(look.body, id).toBe(true);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(100);
    }
    await page.context().close();
  });

  it("shows Contents and Bookmarks as two tabs in one panel", async () => {
    const page = await open(`${mm.url}chapters/ch01.html`);
    await page.click('[popovertarget="reader-contents"]');
    await page.waitForTimeout(300);
    const tabs = page.locator('#reader-contents [role="tab"]');
    expect(await tabs.allTextContents()).toEqual(["Contents", "Bookmarks"]);
    expect(await tabs.nth(0).getAttribute("aria-selected")).toBe("true");
    const contents = page.locator('#reader-contents [role="tabpanel"]').nth(0);
    const bookmarks = page.locator('#reader-contents [role="tabpanel"]').nth(1);
    expect(await contents.isVisible()).toBe(true);
    expect(await bookmarks.isVisible()).toBe(false);
    expect(await contents.locator("a[data-chapter]").count()).toBeGreaterThan(0);

    await tabs.nth(1).click();
    expect(await tabs.nth(1).getAttribute("aria-selected")).toBe("true");
    expect(await contents.isVisible()).toBe(false);
    expect(await bookmarks.isVisible()).toBe(true);
    expect(await page.locator("[data-bookmark-empty]").isVisible()).toBe(true);
    expect(await page.locator("[data-bookmark-empty]").textContent()).toBe("No bookmarks yet.");

    // Arrow keys move between the tabs; the page does not turn behind the panel.
    const before = await indicator(page);
    await page.keyboard.press("ArrowLeft");
    expect(await tabs.nth(0).getAttribute("aria-selected")).toBe("true");
    expect(await contents.isVisible()).toBe(true);
    expect(await indicator(page)).toBe(before);

    // Only the tab content scrolls; the tab switcher stays in place.
    const scroll = await contents.evaluate((el) => getComputedStyle(el).overflowY);
    expect(scroll).toBe("auto");
    await page.context().close();
  });

  it("shows a spinner in the text size panel while the book re-paginates", async () => {
    const page = await open(`${mm.url}chapters/ch01.html`);
    await page.click('[popovertarget="reader-text"]');
    await page.evaluate(() => {
      const w = window as unknown as { busy: string[] };
      w.busy = [];
      const panel = document.getElementById("reader-text")!;
      new MutationObserver(() => w.busy.push(panel.getAttribute("aria-busy") ?? "none")).observe(
        panel,
        { attributes: true, attributeFilter: ["aria-busy"] },
      );
    });
    await page.click("[data-text-larger]");
    await page.waitForTimeout(600);
    const busy = await page.evaluate(() => (window as unknown as { busy: string[] }).busy);
    expect(busy).toEqual(["true", "false"]);
    expect(await page.textContent("[data-text-size]")).toBe("110%");
    expect(await page.locator("[data-text-busy]").isVisible()).toBe(false);
    await page.context().close();
  });
});

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

  it("finishes a turn at once when the next press comes during it", async () => {
    const page = await open(`${mm.url}chapters/ch01.html`);
    const press = async (key: string, pause: number) => {
      await page.keyboard.press(key);
      await page.waitForTimeout(pause);
    };
    const start = await indicator(page);
    // Where two unhurried turns end.
    await press("ArrowRight", 900);
    await press("ArrowRight", 900);
    const twoTurns = await indicator(page);
    await press("ArrowLeft", 900);
    await press("ArrowLeft", 900);
    expect(await indicator(page)).toBe(start);
    // The second press comes 100 ms into the first turn: both turns still happen.
    await press("ArrowRight", 100);
    await press("ArrowRight", 900);
    expect(await indicator(page)).toBe(twoTurns);
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
    // A height where both swipe ends are over plain text: gestures that start on a table or code
    // block are left to it (it may scroll sideways).
    const plainAt = () =>
      page.evaluate(() => {
        for (let y = 150; y < innerHeight - 150; y += 10) {
          const clear = [60, 330].every(
            (x) => !document.elementFromPoint(x, y)?.closest("pre, table, .terminal"),
          );
          if (clear) return y;
        }
        return 400;
      });
    await swipe(page, 330, 60, await plainAt());
    await page.waitForTimeout(800);
    const next = await indicator(page);
    expect(next).not.toBe(start);
    await swipe(page, 60, 330, await plainAt());
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
    // The reader fills the bookmark list when the Contents panel opens; it is on its Bookmarks tab.
    await page.click('[popovertarget="reader-contents"]');
    await page.click('#reader-contents [role="tab"]:nth-child(2)');
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
    const folios = await page.$$eval("[data-page-number]:not([hidden]) .outside", (els) =>
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
