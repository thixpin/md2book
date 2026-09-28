import { describe, expect, it } from "vitest";
import { highlightFences } from "../../../src/markdown/highlight.ts";

const BAR =
  '<div class="terminal-bar"><span class="terminal-dot"></span>' +
  '<span class="terminal-dot"></span><span class="terminal-dot"></span></div>';

describe("terminal blocks", () => {
  it.each(["console", "terminal", "shell-session"])("renders %s as a terminal window", (lang) => {
    const html = highlightFences(
      `<pre><code class="language-${lang}">$ node --version\nv26.10.0\n</code></pre>\n`,
    );
    expect(html.startsWith(`<div class="terminal">${BAR}<pre class="console"><code>`)).toBe(true);
    expect(html).toContain("</code></pre></div>");
    expect(html).toContain('<span class="gp">$ </span>');
    expect(html).toContain('<span class="go">v26.10.0</span>');
  });

  it("highlights the command after the prompt as bash", () => {
    const html = highlightFences(
      '<pre><code class="language-console">$ echo &quot;hi&quot;\n</code></pre>\n',
    );
    expect(html).toMatch(/<span class="gp">\$ <\/span><span class="n[fb]">echo<\/span>/);
    expect(html).not.toContain('class="go"');
  });
});
