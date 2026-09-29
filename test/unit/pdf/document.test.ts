// Expected values computed with development-book/publish/build.py (d235dbd):
// fit_pre_blocks and add_syllable_breaks.
import { describe, expect, it } from "vitest";
import { addSyllableBreaks, fitPreBlocks } from "../../../src/pdf/document.ts";

describe("fitPreBlocks", () => {
  it("short line → 8.30pt", () => {
    expect(fitPreBlocks('<pre class="code"><code>x = 1</code></pre>')).toBe(
      '<pre class="code" style="font-size: 8.30pt"><code>x = 1</code></pre>',
    );
  });
  it("80 characters → 7.26pt", () => {
    expect(
      fitPreBlocks(
        '<pre class="code"><code>aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</code></pre>',
      ),
    ).toBe(
      '<pre class="code" style="font-size: 7.26pt"><code>aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</code></pre>',
    );
  });
  it("200 characters → clamped to 6.00pt", () => {
    expect(
      fitPreBlocks(
        '<pre class="code"><code>bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb</code></pre>',
      ),
    ).toBe(
      '<pre class="code" style="font-size: 6.00pt"><code>bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb</code></pre>',
    );
  });
  it("tags removed and entities decoded before measuring", () => {
    expect(
      fitPreBlocks(
        '<pre class="code"><code>if (a &lt; b) {\n  <span class="k">return</span> 1;\n}</code></pre>',
      ),
    ).toBe(
      '<pre class="code" style="font-size: 8.30pt"><code>if (a &lt; b) {\n  <span class="k">return</span> 1;\n}</code></pre>',
    );
  });
  it("every pre in a fragment, with or without attributes", () => {
    expect(
      fitPreBlocks(
        '<p>before</p><pre><code>cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc</code></pre><p>after</p><pre class="code"><code>short</code></pre>',
      ),
    ).toBe(
      '<p>before</p><pre style="font-size: 6.00pt"><code>cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc</code></pre><p>after</p><pre class="code" style="font-size: 8.30pt"><code>short</code></pre>',
    );
  });
});

describe("addSyllableBreaks", () => {
  it("before syllable-initial consonants, not after virama or before asat", () => {
    expect(addSyllableBreaks("ကျွန်ုပ်တို့ သင်္ချိုင်း မန္တလေး ပြည်ထောင်စု")).toBe(
      "ကျွန်ုပ်\u200bတို့ သင်္ချိုင်း မန္တ\u200bလေး ပြည်\u200bထောင်\u200bစု",
    );
  });
  it("outside code and pre", () => {
    expect(
      addSyllableBreaks("<p>မြန်မာစာ <code>မြန်မာ</code> ဆရာ</p><pre><code>ကျွန်တော်</code></pre>"),
    ).toBe(
      "<p>မြန်\u200bမာ\u200bစာ <code>မြန်မာ</code> ဆ\u200bရာ</p><pre><code>ကျွန်တော်</code></pre>",
    );
  });
  it("English unchanged", () => {
    expect(addSyllableBreaks("<p>Plain English text.</p>")).toBe("<p>Plain English text.</p>");
  });
  it("never inside tags", () => {
    expect(addSyllableBreaks('<a href="ကက">ကက</a>')).toBe('<a href="ကက">က\u200bက</a>');
  });
});
