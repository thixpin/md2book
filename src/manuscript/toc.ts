import type { Chapter } from "./chapters.ts";
import type { Part } from "./parts.ts";
import { escapeHtml } from "./text.ts";

/** Nested contents list; `hrefFormat` contains `{slug}`. Parts with no chapters are omitted. */
export function tocListHtml(parts: Part[], chapters: Chapter[], hrefFormat: string): string {
  const items = (list: Chapter[]) =>
    list
      .map(
        (ch) =>
          `<li><a href="${hrefFormat.replace("{slug}", ch.slug)}">${escapeHtml(ch.fullTitle)}</a></li>`,
      )
      .join("");
  if (parts.length === 0) return `<ol>${items(chapters)}</ol>`;

  const groups = parts
    .filter((part) => part.chapters.length > 0)
    .map(
      (part) =>
        `<li class="toc-part"><span class="toc-part-title">${escapeHtml(`${part.label} - ${part.title}`)}</span>` +
        `<ol>${items(part.chapters)}</ol></li>`,
    );
  return `<ol class="toc-parts">${groups.join("")}</ol>`;
}
