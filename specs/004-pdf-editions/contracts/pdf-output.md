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

- `print.css`: `pre { line-height: 1.7; }` (FR-018);
- `printed.css`: `.terminal-dot` children 1, 2, 3 get a black `::after` mark centred in the
  hollow dot: a small filled dot, a horizontal minus and a diagonal line (bottom-left to top-right);
- `paged.css`:
  - `.pagedjs_page.chapter-first .pagedjs_margin { visibility: hidden; }`
  - `.pagedjs_page.pagedjs_blank_page .pagedjs_margin { visibility: hidden; }`
  - `[data-align-last-split-element='justify']:not(p, li) { text-align-last: auto; }`
- `paged-handler.js`: a `Paged.Handler` whose `afterPageLayout(page)` adds `chapter-first` when the
  page contains `.chapter-head`.

## Pages

| page | header | folio |
|---|---|---|
| cover (screen) | none | none, zero margin, image fills 170 × 240 mm |
| title, copyright, contents, end image | none | none |
| chapter opening | none | none |
| blank (recto padding) | none | none |
| other left page | book title, top left, 8.5 pt | bottom centre, 9 pt |
| other right page | current chapter title, top right, 8.5 pt | bottom centre, 9 pt |

`running_headers: false` removes both headers; folios stay.

## Normalisation (after printing)

Every page: MediaBox = CropBox = `[0, h − 680.31, 481.89, h]` where `h` is Chromium's page height;
Info: no `/CreationDate`, no `/ModDate`, `/Producer` and `/Creator` `md2book`; saved without object
streams. Two builds of the same input are byte-identical.
