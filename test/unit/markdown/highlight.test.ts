import { describe, expect, it } from "vitest";
import { highlightFences } from "../../../src/markdown/highlight.ts";

const VOCAB = new Set(
  (
    "k kc kd kn kp kr kt ow s s1 s2 sa sb sc dl sd se sh si sx sr ss m mb mf mh mi mo il " +
    "c ch cm c1 cs cpf nc nf fm nb bp cp nd err gp go gt gr nv"
  ).split(" "),
);

const fence = (lang: string, code: string) =>
  `<pre><code class="language-${lang}">${code}</code></pre>\n`;

function classesIn(html: string): string[] {
  return [...html.matchAll(/<span class="([^"]+)">/g)].map((m) => m[1]!);
}

describe("highlightFences", () => {
  it.each([
    ["ts", "export const x: number = 42; // hi\n"],
    ["js", "function f(a) { return `t${a}`; }\n"],
    ["json", '{"a": true, "b": null}\n'],
    ["python", 'def f():\n    return "s"  # c\n'],
    ["bash", "node --version | grep v\n"],
  ])("highlights %s with the Pygments class vocabulary only", (lang, code) => {
    const html = highlightFences(fence(lang, code));
    expect(html.startsWith(`<pre class="code"><code class="language-${lang}">`)).toBe(true);
    const classes = classesIn(html);
    expect(classes.length).toBeGreaterThan(0);
    expect(classes.filter((c) => !VOCAB.has(c))).toEqual([]);
  });

  it("maps keywords, strings, numbers and comments", () => {
    const html = highlightFences(fence("ts", "const s = &quot;a&quot;; // c\nlet n = 1;\n"));
    expect(html).toContain('<span class="k">const</span>');
    expect(html).toContain('<span class="s2">&quot;a&quot;</span>');
    expect(html).toContain('<span class="c1">// c</span>');
    expect(html).toContain('<span class="mi">1</span>');
  });

  it("lower-cases the language name", () => {
    expect(highlightFences(fence("TS", "const a = 1;\n"))).toContain('class="language-ts"');
  });

  it("leaves an unknown language block unchanged", () => {
    const block = fence("nosuchlang", "a &lt; b\n");
    expect(highlightFences(block)).toBe(block);
  });

  it("leaves a block without a language unchanged", () => {
    const block = "<pre><code>a &lt; b\n</code></pre>\n";
    expect(highlightFences(block)).toBe(block);
  });

  it("keeps the code text intact", () => {
    const html = highlightFences(fence("ts", "if (a &lt; b &amp;&amp; c) {}\n"));
    expect(html.replace(/<[^>]+>/g, "")).toBe("if (a &lt; b &amp;&amp; c) {}\n\n");
  });
});
