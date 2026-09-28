import { describe, expect, it } from "vitest";
import { loadChapters } from "../../../src/manuscript/chapters.ts";
import { loadParts } from "../../../src/manuscript/parts.ts";
import { bookMm } from "../../helpers/fixture-config.ts";
import { hashTree } from "../../helpers/hash.ts";
import { fixture } from "../../helpers/temp.ts";

describe("manuscript sources (Constitution II)", () => {
  it("are byte-identical after loading chapters and parts", async () => {
    const before = hashTree(fixture("book-mm"));
    const config = await bookMm();
    await loadParts(config, await loadChapters(config));
    expect(hashTree(fixture("book-mm"))).toEqual(before);
  });
});
