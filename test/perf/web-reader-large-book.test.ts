// The page-turn surfaces of a long book (found with an 800-page book: every surface held a copy
// of the whole book, 25 copies, so a turn took seconds and memory grew with the book).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/load.ts";
import type { Served } from "../../src/web/serve.ts";
import { PNG_1X1, tempDir } from "../helpers/temp.ts";
import { DEVICES, contextOptions, launch, ready, serveFixture } from "../e2e/helpers.ts";

const CHAPTERS = 12;
const my = (n: number) => String(n).replace(/[0-9]/g, (d) => String.fromCodePoint(0x1040 + +d));
const PARAGRAPH =
  "Programmer တစ်ယောက်ကို “ဒါလေး ရေးပေးပါ” လို့ ပြောလိုက်တာနဲ့ ချက်ချင်း code တန်းရေးလို့ မရပါဘူး။ " +
  "ပြဿနာကို နားလည်အောင် အရင် ဖတ်ရပါမယ်၊ ဘာတွေ ဝင်လာမလဲ၊ ဘာတွေ ထွက်ရမလဲ ဆိုတာ စဉ်းစားရပါမယ်။";

function chapter(n: number): string {
  const sections = Array.from({ length: 6 }, (_, s) =>
    [
      `## ခေါင်းစဉ် ${n}.${s}`,
      ...Array.from({ length: 4 }, () => PARAGRAPH),
      "```python\nfor i in range(3):\n    print(i)\n```",
      "| a | b |\n| --- | --- |\n| 1 | 2 |",
    ].join("\n\n"),
  );
  return `# အခန်း (${my(n)}) - စမ်းသပ် ${my(n)}\n\n${sections.join("\n\n")}\n`;
}

let browser: Browser;
let served: Served;

beforeAll(async () => {
  const dir = tempDir();
  mkdirSync(join(dir, "chapters"));
  mkdirSync(join(dir, "cover"));
  writeFileSync(join(dir, "cover", "cover.png"), PNG_1X1);
  const names = Array.from(
    { length: CHAPTERS },
    (_, i) => `chapter-${String(i + 1).padStart(2, "0")}.md`,
  );
  names.forEach((name, i) => writeFileSync(join(dir, "chapters", name), chapter(i + 1)));
  writeFileSync(
    join(dir, "book.json"),
    JSON.stringify({
      title: "ရှည်လျားသော စာအုပ်",
      author: "A",
      year: "2026",
      identifier: "urn:uuid:x",
      output_name: "long",
      cover: "cover/cover.png",
      chapter_glob: "chapters/chapter-*.md",
      web_published_chapters: names,
    }),
  );
  served = await serveFixture((await loadConfig(join(dir, "book.json"))).config);
  browser = await launch();
}, 120_000);
afterAll(async () => {
  await browser?.close();
  await served?.close();
});

async function open(url: string): Promise<Page> {
  const desktop = DEVICES.find((d) => d.name === "Desktop (mouse)")!;
  const page = await (await browser.newContext(contextOptions(desktop))).newPage();
  await page.goto(url);
  await ready(page);
  return page;
}

async function turn(page: Page) {
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1200);
}

describe("page turns in a long book", { timeout: 120_000 }, () => {
  it("prepares the next and previous turns while the reader is idle", async () => {
    // Chapter 4 opens on a new spread; turning back crosses into chapter 3, whose copies
    // must already be prepared.
    const page = await open(`${served.url}chapters/ch04.html`);
    await page.waitForTimeout(800);
    // Copies exist before any further turn starts, and the next turn clones nothing.
    const before = await page.evaluate(() => document.querySelectorAll(".turn-copy").length);
    expect(before).toBeGreaterThan(0);
    const status = await page.textContent("[data-page-status]");
    await page.evaluate(() => {
      const w = window as unknown as { addedCopies: number };
      w.addedCopies = 0;
      new MutationObserver((records) => {
        for (const record of records)
          for (const node of record.addedNodes)
            if (node instanceof Element && node.classList.contains("turn-copy")) w.addedCopies++;
      }).observe(document.body, { childList: true, subtree: true });
    });
    await page.keyboard.press("ArrowLeft");
    // The turn has started (its first frame) by the time the next animation frame runs.
    const added = await page.evaluate(
      () =>
        new Promise<number>((resolve) =>
          requestAnimationFrame(() =>
            resolve((window as unknown as { addedCopies: number }).addedCopies),
          ),
        ),
    );
    expect(added).toBe(0);
    await page.waitForTimeout(1200);
    expect(await page.textContent("[data-page-status]")).not.toBe(status);
    await page.context().close();
  });

  it("copies only the section a turning page belongs to, never the whole book", async () => {
    const page = await open(`${served.url}chapters/ch05.html`);
    await turn(page);
    await turn(page);
    const copies = await page.evaluate(() => {
      const flow = document.querySelector(".reader-flow:not(.turn-copy)")!;
      const all = [...document.querySelectorAll(".turn-copy")];
      return {
        count: all.length,
        flowNodes: flow.querySelectorAll("*").length,
        sections: all.map((copy) => copy.children.length),
        perSurface: Math.max(
          ...all.map((copy) => copy.parentElement!.querySelectorAll(":scope > .turn-copy").length),
        ),
        nodes: all.reduce((sum, copy) => sum + copy.querySelectorAll("*").length, 0),
      };
    });
    expect(copies.count).toBeGreaterThan(0);
    for (const sections of copies.sections) expect(sections).toBeLessThanOrEqual(1);
    // Each surface keeps at most the sections of the next and the previous turn.
    expect(copies.perSurface).toBeLessThanOrEqual(2);
    expect(copies.nodes).toBeLessThan(copies.flowNodes * 5);
    await page.context().close();
  });

  it("lays a section out on the same pages in a turn copy as in the book", async () => {
    const page = await open(`${served.url}chapters/ch07.html`);
    await turn(page);
    // Measure in layout coordinates: the turning sheet's 3D transforms mirror its back faces.
    await page.addStyleTag({
      content: "[data-turn-sheet], [data-turn-sheet] * { transform: none !important; }",
    });
    const mismatches = await page.evaluate(() => {
      const columns = (el: Element) => {
        const styles = getComputedStyle(el);
        const n = Number(styles.columnCount);
        const padding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
        const gap = parseFloat(styles.columnGap);
        const width = (parseFloat(styles.width) - padding - (n - 1) * gap) / n;
        const start = el.getBoundingClientRect().left + parseFloat(styles.paddingLeft);
        return (rect: DOMRect) => Math.floor((rect.left - start + 1) / (width + gap));
      };
      const flow = document.querySelector(".reader-flow:not(.turn-copy)")!;
      const flowColumn = columns(flow);
      const problems: string[] = [];
      let compared = 0;
      for (const copy of document.querySelectorAll(".turn-copy")) {
        const section = copy.firstElementChild;
        if (!section) continue;
        const slug = (section as HTMLElement).dataset.chapter;
        const original = slug
          ? flow.querySelector(`.book-chapter[data-chapter="${slug}"]`)
          : [...flow.children].find((child) => child.className === section.className);
        if (!original) continue;
        const copyColumn = columns(copy);
        const offset = flowColumn(original.getClientRects()[0]!);
        const a = [...original.querySelectorAll("p, pre, h2, table")];
        const b = [...section.querySelectorAll("p, pre, h2, table")];
        a.forEach((el, i) => {
          const inBook = flowColumn(el.getClientRects()[0]!) - offset;
          const inCopy = copyColumn(b[i]!.getClientRects()[0]!);
          compared++;
          if (inBook !== inCopy)
            problems.push(`${slug} #${i}: book page ${inBook}, copy page ${inCopy}`);
        });
      }
      return { problems, compared };
    });
    expect(mismatches.compared).toBeGreaterThan(50);
    expect(mismatches.problems).toEqual([]);
    await page.context().close();
  });
});
