import { describe, expect, it } from "vitest";
import type { Chapter } from "../../../src/manuscript/chapters.ts";
import { chapterHeadHtml } from "../../../src/markdown/chapter-head.ts";

describe("chapterHeadHtml", () => {
  it("renders the label and title, escaped", () => {
    const ch = { label: "အခန်း (၁)", title: "A & <B>" } as Chapter;
    expect(chapterHeadHtml(ch)).toBe(
      '<header class="chapter-head"><p class="chapter-number">အခန်း (၁)</p>' +
        "<h1>A &amp; &lt;B&gt;</h1></header>",
    );
  });
});
