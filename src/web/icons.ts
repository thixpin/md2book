// Line icons from Lucide (https://lucide.dev), ISC licence:
// Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT).
// All other copyright for Lucide are held by Lucide Contributors 2022. Permission to use, copy,
// modify, and/or distribute this software for any purpose with or without fee is hereby granted.
// Paths copied verbatim from development-book/publish/web.py ICON_PATHS (d235dbd).
export const ICON_PATHS = {
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  "bookmark-check":
    '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/><path d="m9 10 2 2 4-4"/>',
  "maximize-2": '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  "minimize-2": '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
  "chevron-left": '<path d="m15 18-6-6 6-6"/>',
  "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  // Lucide `a-large-small` (lucide-static 1.48.0, ISC): the text-size control.
  "a-large-small":
    '<path d="m15 16 2.536-7.328a1.02 1.02 1 0 1 1.928 0L22 16"/><path d="M15.697 14h5.606"/>' +
    '<path d="m2 16 4.039-9.69a.5.5 0 0 1 .923 0L11 16"/><path d="M3.304 13h6.392"/>',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function icon(name: IconName): string {
  return (
    `<svg class="icon icon-${name}" viewBox="0 0 24 24" aria-hidden="true" ` +
    `focusable="false">${ICON_PATHS[name]}</svg>`
  );
}

/** Lucide `book-open` (lucide-static 1.48.0, ISC): the default favicon's glyph. */
export const BOOK_OPEN_PATHS =
  '<path d="M12 5v16"/><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/>';
