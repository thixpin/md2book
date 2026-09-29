import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pagedBundle, pagedPolyfillPath, patchPaged } from "../../../src/pdf/paged.ts";

const original = readFileSync(pagedPolyfillPath(), "utf8");

describe("pagedBundle", () => {
  it("is the pinned Paged.js polyfill with exactly the two md2book patches", () => {
    const before = original.split("\n");
    const after = pagedBundle().split("\n");
    expect(after).toHaveLength(before.length);
    const changed = after.filter((line, i) => line !== before[i]);
    expect(changed).toHaveLength(2);
    expect(changed[0]).toContain('!(node.parentElement && node.parentElement.closest("pre"))');
    expect(changed[1]).toContain("if (false && selector.match(/\\+/))");
  });

  it("fails loudly when a patch target is missing (a changed Paged.js)", () => {
    for (const target of [
      "isAllWhitespace(node)); // a text node, all whitespace",
      "if (selector.match(/\\+/)) {",
    ]) {
      expect(() => patchPaged(original.replace(target, "changed"))).toThrow(
        /Paged\.js patch target not found/,
      );
    }
  });
});
