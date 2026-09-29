import { describe, expect, it } from "vitest";
import { loadBook } from "../../../src/book/load.ts";
import { bookHeadings, bookMm } from "../../helpers/fixture-config.ts";

describe("loadBook", () => {
  it("loads, expands and renders every chapter with its parts", async () => {
    const { chapters, parts } = await loadBook(await bookMm());
    expect(chapters.map((c) => c.slug)).toEqual(["ch01", "ch02"]);
    expect(parts).toHaveLength(1);
    for (const ch of chapters) {
      expect(ch.expandedMd).toBeDefined();
      expect(ch.html).toContain("<p>");
      expect(ch.plainText?.length).toBeGreaterThan(0);
    }
    expect(chapters[0]!.includes?.[0]?.ref).toBe("sample.ts#greet");
  });

  it("renders the heading fixture: levels 2–6, each followed by every block type", async () => {
    const { chapters } = await loadBook(await bookHeadings());
    const html = chapters.map((c) => c.html).join("");
    for (const level of [2, 3, 4, 5, 6]) expect(html).toContain(`<h${level}>HEADING-`);
    expect(html.match(/HEADING-\d+/g)).toHaveLength(36);
    for (const block of [
      '<pre class="code"',
      "<ul>",
      "<table>",
      'class="terminal"',
      'class="callout',
    ]) {
      expect(html).toContain(block);
    }
  });
});
