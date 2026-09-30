// Configurable running heads and feet in the PDF (`running`): six slots, five values.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BookConfig } from "../../../src/config/load.ts";
import { slotValues, type SlotValue } from "../../../src/config/presets.ts";
import { loadManifest } from "../../../src/fonts/manifest.ts";
import { printStylesheets } from "../../../src/pdf/stylesheets.ts";
import { bookMm } from "../../helpers/fixture-config.ts";
import { FIXTURE_MANIFEST } from "../../helpers/fonts.ts";

const fixture = (name: string) =>
  readFileSync(new URL(`../../fixtures/running/${name}`, import.meta.url), "utf8");

async function bookCss(change: (config: BookConfig) => BookConfig = (c) => c, printed = false) {
  const { sets } = await loadManifest(FIXTURE_MANIFEST);
  return printStylesheets(sets["my-sans"], change(await bookMm()), printed).at(-1)!.css;
}

type Line = "top" | "bottom";
type Slot = "inner" | "center" | "outer";
const withSlot = (line: Line, slot: Slot, value: SlotValue) => (config: BookConfig) => ({
  ...config,
  running: { ...config.running, [line]: { ...config.running[line], [slot]: value } },
});

/** The declarations of one margin box inside `@page <selector> { … }`. */
function box(css: string, selector: string, name: string): string | undefined {
  const rule = css.split("\n").find((line) => line.startsWith(`@page ${selector} {`));
  return rule ? new RegExp(`@${name} \\{ ([^}]*) \\}`).exec(rule)?.[1] : undefined;
}

const CONTENT: Record<SlotValue, string> = {
  author: 'content: "Fixture Author";',
  "book-title": 'content: "မြန်မာ စမ်းသပ်စာအုပ်";',
  "chapter-title": "content: string(chaptertitle);",
  "page-number": "content: var(--md2book-folio);",
  none: "content: none;",
};

describe("running heads and feet (PDF)", () => {
  it("reproduces the current book.css exactly by default", async () => {
    expect(await bookCss()).toBe(fixture("book-mm.book.css"));
    expect(await bookCss((c) => c, true)).toBe(fixture("book-mm-printed.book.css"));
    expect(await bookCss((c) => ({ ...c, running_headers: false }))).toBe(
      fixture("book-mm-no-headers.book.css"),
    );
  });

  // Outer is the edge away from the spine: left on a left page, right on a right page.
  const PLACES: Record<Slot, { left: string; right: string }> = {
    outer: { left: "left", right: "right" },
    inner: { left: "right", right: "left" },
    center: { left: "center", right: "center" },
  };
  for (const line of ["top", "bottom"] as const) {
    for (const slot of ["inner", "center", "outer"] as const) {
      for (const value of slotValues) {
        it(`puts ${value} in ${line}.${slot}, mirrored on left and right pages`, async () => {
          const css = await bookCss(withSlot(line, slot, value));
          for (const side of ["left", "right"] as const) {
            const declarations = box(css, `:${side}`, `${line}-${PLACES[slot][side]}`);
            if (slot === "center" && value === "none") {
              expect(declarations, side).toBeUndefined();
            } else {
              expect(declarations, side).toContain(CONTENT[value]);
              if (value !== "none") {
                expect(declarations, side).toContain(
                  line === "top"
                    ? "vertical-align: bottom; padding-bottom: 7.5mm;"
                    : "vertical-align: top; padding-top: 4mm;",
                );
              }
            }
          }
        });
      }
    }
  }

  it("keeps a used center slot off the blank, front matter and cover pages", async () => {
    const css = await bookCss(withSlot("bottom", "center", "page-number"));
    for (const page of [":blank", "front", "cover"]) {
      expect(box(css, page, "bottom-center"), page).toBe("content: none;");
    }
    expect(box(await bookCss(), ":blank", "bottom-center")).toBeUndefined();
  });

  it("still drops the whole top line when running_headers is false", async () => {
    const css = await bookCss((c) =>
      withSlot("top", "center", "book-title")({ ...c, running_headers: false }),
    );
    for (const side of ["left", "right"]) {
      for (const place of ["left", "center", "right"]) {
        const declarations = box(css, `:${side}`, `top-${place}`);
        if (declarations !== undefined) expect(declarations).toBe("content: none;");
      }
    }
  });
});
