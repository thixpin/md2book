import { decodeHTML } from "entities";

const LIMIT = 155;

/**
 * First paragraph as plain text, at most 155 code points, cut only at a space (Burmese is never
 * cut mid-word), trailing ` ,.;:–-` removed and `…` added; `fallback` when there is no paragraph.
 */
export function pageDescription(bodyHtml: string, fallback: string): string {
  const match = /<p>([\s\S]*?)<\/p>/.exec(bodyHtml);
  if (!match) return fallback;
  const text = decodeHTML(match[1]!.replace(/<[^>]+>/g, ""))
    .split(/\s+/u)
    .filter(Boolean)
    .join(" ");
  const chars = [...text];
  if (chars.length <= LIMIT) return text;
  const cut = chars.slice(0, LIMIT).lastIndexOf(" ");
  return `${chars
    .slice(0, cut > 0 ? cut : LIMIT)
    .join("")
    .replace(/[ ,.;:–-]+$/u, "")}…`;
}
