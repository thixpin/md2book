import { describe, expect, it } from "vitest";
import { loadBook } from "../../../src/book/load.ts";
import { bookMm } from "../../helpers/fixture-config.ts";

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
});
