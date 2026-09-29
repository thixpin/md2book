# PDF output contract

Document and served paths: [data-model.md](../data-model.md) → PrintDocument, Served paths.

## Stylesheets, in cascade order

1. `common.css` (carried, feature 002/003), fonts substituted for the set;
2. `print.css` (carried byte-for-byte from `publish/css/print.css`, then md2book additions below),
   fonts substituted;
3. `printed.css` (printed edition only; carried, then additions);
4. `paged.css` (md2book: Paged.js workarounds);
5. `book.css` (generated per book: left header title, running-headers-off rule).

md2book additions (each marked `/* md2book: … */` and guarded by a unit test):

- `print.css`: `pre { line-height: 1.7; }` (FR-018); `h3, h4, h5, h6 { break-after: avoid; }`
  (FR-019);
- `print.css`: `.toc-page li:not(.toc-part) { line-height: 2; margin-bottom: 1.2mm; }` (author
  request: room between contents entries);
- `printed.css`: the dots are 10 px grey circles (`#d4d4d4`, border `#6e6e6e`; whole pixels keep
  them round) and `.terminal-bar .terminal-dot` children 1, 2, 3 carry a centred SVG icon drawn
  in `#2b2b2b`: close (×), minimise (−) and zoom (+), like the macOS window controls;
- `paged.css`:
  - `.pagedjs_page.chapter-first .pagedjs_margin { visibility: hidden; }`
  - `.pagedjs_page.pagedjs_blank_page .pagedjs_margin { visibility: hidden; }`
  - `[data-align-last-split-element='justify']:not(p, li) { text-align-last: auto; }`
- `paged-handler.js`: a `Paged.Handler` whose `afterPageLayout(page)` adds `chapter-first` when the
  page contains `.chapter-head`.

## Rendering sequence

1. Load `/index.html` with `window.PagedConfig = { auto: false }`.
2. Await `document.fonts.ready` and `load()` of every declared face.
3. Await `window.PagedPolyfill.preview()` (10-minute limit). Its promise, not the `after` hook,
   marks the end of layout: `after` can fire before the last pages exist.
4. `page.pdf({ preferCSSPageSize: true, printBackground: true })`, then normalise.

The served Paged.js bundle carries two exact patches (research R-01): whitespace-only text inside
`<pre>` is not ignorable; the `Following` sibling-rule rewrite is disabled.

## Shared pagination rule (PDF and web, User Story 5)

A section heading (`h2`–`h6` in a chapter body) is followed on its page by at least 2 lines of the
next block (or the whole of an unbreakable block), otherwise it starts the next page.

- PDF: `break-after: avoid` on `h2` (carried) and `h3`–`h6` (addition), with `orphans: 2`.
- Web: `web.css` `h3`–`h6` `break-after: avoid` (addition, `h2` exists); `.keep-with-next
  { break-before: column; }`; the reader's pass at the end of `measure()` adds `keep-with-next`
  to a heading whose next element has fewer than 2 line boxes in the heading's column, in document
  order, re-measuring after each change; it removes all `keep-with-next` classes before measuring.

## Pages

| page | header | folio |
|---|---|---|
| cover (screen) | none | none, zero margin, image fills 170 × 240 mm |
| title, copyright, contents, end image | none | none |
| chapter opening | none | none |
| blank (recto padding) | none | none |
| other left page | book title, top left, 8.5 pt | bottom left, 9 pt |
| other right page | current chapter title, top right, 8.5 pt | bottom right, 9 pt |

`running_headers: false` removes both headers; folios stay.

Numbering (FR-022): page 1 is chapter one's first page; the front matter has no numbers; digits
follow `strings.chapter_digits`. `book.css` sets `#ch01 { counter-reset: page 1; }` (for the
contents' `target-counter`, in Myanmar digits via the `myanmar` counter style) and shows
`var(--md2book-folio)` in `@bottom-left` (left pages) and `@bottom-right` (right pages);
`assets/paged-handler.js` writes `--md2book-folio` on every page from chapter one on, because a
`counter-reset` on one Paged.js page box does not reach the following boxes in Chromium.

## Normalisation (after printing)

Every page: MediaBox = CropBox = `[0, h − 680.31, 481.89, h]` where `h` is Chromium's page height;
Info: no `/CreationDate`, no `/ModDate`, `/Producer` and `/Creator` `md2book`; saved without object
streams. Two builds of the same input are byte-identical.
