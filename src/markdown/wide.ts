import { decodeHTML } from "entities";

const PRE_RE = /<pre(?: class="([^"]*)")?>(<code[^>]*>)([\s\S]*?)<\/code><\/pre>/g;

function longestLine(fragment: string): number {
  return Math.max(
    0,
    ...fragment.split("\n").map((line) => [...decodeHTML(line.replace(/<[^>]+>/g, ""))].length),
  );
}

/** Adds `wide` (> 56 visible characters) or `xwide` (> 72) to every `<pre>`. */
export function tagWidePre(html: string): string {
  return html.replace(PRE_RE, (_match, cls: string | undefined, code: string, body: string) => {
    const longest = longestLine(body);
    const classes = cls ? cls.split(/\s+/).filter(Boolean) : [];
    if (longest > 72) classes.push("xwide");
    else if (longest > 56) classes.push("wide");
    const attr = classes.length ? ` class="${classes.join(" ")}"` : "";
    return `<pre${attr}>${code}${body}</code></pre>`;
  });
}
