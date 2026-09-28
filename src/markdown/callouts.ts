import type { SeriesStrings } from "../config/language.ts";

const CALLOUT_RE = /<blockquote>\s*<p>\[!([A-Za-z]+)\]\s*([\s\S]*?)<\/blockquote>/g;
const KINDS = { NOTE: "note", WARNING: "warning", TRY: "try" } as const;

/** GitHub alert syntax: a blockquote starting `[!NOTE]`, `[!WARNING]` or `[!TRY]` (any case). */
export function convertCallouts(html: string, titles: SeriesStrings["callout_titles"]): string {
  return html.replace(CALLOUT_RE, (match, marker: string, rest: string) => {
    const kind = KINDS[marker.toUpperCase() as keyof typeof KINDS];
    if (!kind) return match;
    const body = `<p>${rest.trim()}`.replace(/^<p>\s*<\/p>\s*/, "");
    return `<div class="callout callout-${kind}"><p class="callout-title">${titles[kind]}</p>${body}</div>`;
  });
}
