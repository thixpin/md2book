import { describe, expect, it } from "vitest";
import type { Chapter } from "../../../src/manuscript/chapters.ts";
import type { Part } from "../../../src/manuscript/parts.ts";
import { tocListHtml } from "../../../src/manuscript/toc.ts";

const chapter = (index: number, fullTitle: string) =>
  ({ index, slug: `ch0${index}`, fullTitle }) as Chapter;
const part = (label: string, title: string, chapters: Chapter[]): Part => ({
  label,
  title,
  first: 0,
  last: 0,
  chapters,
});

describe("tocListHtml", () => {
  const one = chapter(1, "အခန်း (၁) - A & B");
  const two = chapter(2, 'အခန်း (၂) - "Quoted"');

  it("renders a flat list", () => {
    expect(tocListHtml([], [one, two], "{slug}.xhtml")).toBe(
      '<ol><li><a href="ch01.xhtml">အခန်း (၁) - A &amp; B</a></li>' +
        '<li><a href="ch02.xhtml">အခန်း (၂) - &quot;Quoted&quot;</a></li></ol>',
    );
  });

  it("nests by part and omits parts with no chapters", () => {
    const parts = [part("Part I", "Basics", [one]), part("Part II", "Empty", [])];
    expect(tocListHtml(parts, [one], "#{slug}")).toBe(
      '<ol class="toc-parts"><li class="toc-part"><span class="toc-part-title">Part I - Basics</span>' +
        '<ol><li><a href="#ch01">အခန်း (၁) - A &amp; B</a></li></ol></li></ol>',
    );
  });
});
