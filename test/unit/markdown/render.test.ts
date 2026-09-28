import { XMLValidator } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { defaultStrings } from "../../../src/config/language.ts";
import { renderMarkdown } from "../../../src/markdown/render.ts";

const strings = defaultStrings("my", "sans");
const render = (md: string) => renderMarkdown(md, strings);

describe("renderMarkdown", () => {
  it("produces well-formed XHTML", () => {
    const html = render(
      "Para with *emphasis*, `code` & more.\n\n---\n\n| a | b |\n|---|---:|\n| 1 | 2 |\n\n```ts\nconst a = 1 < 2;\n```\n",
    );
    expect(XMLValidator.validate(`<div>${html}</div>`)).toBe(true);
  });

  it("renders pipe tables and right-aligns ---: columns", () => {
    const html = render("| a | b |\n|---|---:|\n| 1 | 2 |\n");
    expect(html).toContain("<table>");
    expect(html).toMatch(/<th style="text-align:\s*right;?">b<\/th>/);
    expect(html).toMatch(/<td style="text-align:\s*right;?">2<\/td>/);
  });

  it("renders --- as a scene break <hr />", () => {
    expect(render("One\n\n---\n\nTwo\n")).toContain("<hr />");
  });

  it("passes HTML comments through", () => {
    expect(render("<!-- note -->\n\nText\n")).toContain("<!-- note -->");
  });

  it("keeps two callouts separated only by blank lines separate", () => {
    const html = render("> [!NOTE]\n> One.\n\n> [!WARNING]\n> Two.\n");
    expect(html.match(/class="callout /g)).toHaveLength(2);
  });

  it("applies the pipeline: highlight, callouts and wide tagging", () => {
    const html = render(`\`\`\`console\n$ echo ${"x".repeat(60)}\n\`\`\`\n`);
    expect(html).toContain('<pre class="console wide">');
  });
});
