import { describe, expect, it } from "vitest";
import { tagWidePre } from "../../../src/markdown/wide.ts";

const pre = (cls: string | null, body: string) =>
  `<pre${cls ? ` class="${cls}"` : ""}><code>${body}</code></pre>`;

describe("tagWidePre", () => {
  it("leaves lines of 56 characters alone", () => {
    expect(tagWidePre(pre(null, "x".repeat(56)))).toBe(pre(null, "x".repeat(56)));
  });

  it("tags lines over 56 as wide", () => {
    expect(tagWidePre(pre("code", "x".repeat(57)))).toBe(pre("code wide", "x".repeat(57)));
  });

  it("tags lines over 72 as xwide only", () => {
    expect(tagWidePre(pre(null, "x".repeat(73)))).toBe(pre("xwide", "x".repeat(73)));
  });

  it("measures visible text: markup removed, entities decoded, code points counted", () => {
    const body = `<span class="k">${"&lt;".repeat(57)}</span>`;
    expect(tagWidePre(pre(null, body))).toBe(pre("wide", body));
    const burmese = "က".repeat(56);
    expect(tagWidePre(pre(null, burmese))).toBe(pre(null, burmese));
  });
});
