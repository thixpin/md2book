import { describe, expect, it } from "vitest";
import { pageDescription } from "../../../src/web/description.ts";

// Ports of development-book/publish/test_web.py cases 4 and 5 (REF §11).
describe("pageDescription", () => {
  const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");

  it("cuts the first paragraph at a space and ends with …", () => {
    const text = pageDescription(`<h2>Heading text</h2><p>${long}</p>`, "fallback");
    expect(text.endsWith("…")).toBe(true);
    expect([...text].length).toBeLessThanOrEqual(156);
    expect(long.startsWith(text.slice(0, -1))).toBe(true);
    expect(long[text.length - 1]).toBe(" ");
    expect(text).not.toContain("Heading");
  });

  it("keeps a short paragraph whole", () => {
    expect(pageDescription("<p>Short one.</p>", "fallback")).toBe("Short one.");
  });

  it("strips markup and decodes entities", () => {
    expect(pageDescription("<p>Use <code>a &amp; b</code>.</p>", "fallback")).toBe("Use a & b.");
  });

  it("falls back when there is no paragraph", () => {
    expect(pageDescription("<h2>Only a heading</h2>", "fallback")).toBe("fallback");
  });

  it("hard-cuts at 155 when there is no space and strips trailing punctuation", () => {
    const text = pageDescription(`<p>${"က".repeat(154)}.,${"ခ".repeat(10)}</p>`, "f");
    expect(text).toBe(`${"က".repeat(154)}…`);
  });

  it("counts code points, not UTF-16 units", () => {
    const burmese = "မြန်မာ ".repeat(22).trim();
    expect([...pageDescription(`<p>${burmese}</p>`, "f")].length).toBeLessThanOrEqual(156);
  });
});
