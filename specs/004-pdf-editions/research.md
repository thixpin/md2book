# Research: PDF Editions

Measured on 2026-09-29 with Playwright 1.63 (Chromium 153 and the bundled WebKit), `pagedjs` 0.4.3, `pdfjs-dist` 6.3.289,
`pdf-lib` 1.17.1 and `@napi-rs/canvas` 1.0.9. Baselines: the Python toolchain at `d235dbd`,
rebuilt in a temporary copy: `book-01` (1 chapter, 12 pages) and a 20-chapter book made from
`book-01`'s chapter with 4 parts and `recto_chapter_start: true` (164 pages). Both toolchains got
the same print HTML (the reference's `book-print.html`) so layout engines were compared, not
pipelines. Spike scripts stayed in the session scratchpad; the findings below are what carries over.

## R-01 Layout engine (plan-input R2)

- **Decision**: Paged.js (`pagedjs` pinned to exactly `0.4.3`) running inside headless Chromium
  (Playwright, already a dependency), then `page.pdf({ preferCSSPageSize: true,
  printBackground: true })` once the book's fonts are loaded and `PagedPolyfill.preview()` has
  resolved (start sequence below).
- **Evidence**:
  - Native Chromium printing (no Paged.js) supports page size, `:left`/`:right` margins,
    `@bottom-center` folios and named pages, but not `string-set`/`string()` (no running
    headers) and not `target-counter()` (no contents page numbers). Rejected.
  - Paged.js: contents page numbers identical to the reference for all 20 chapters; right-page
    running header (`string(chaptertitle)` from `content()`) works; mirrored margins, recto starts
    with blank pages, `break-after: avoid`, `break-inside: avoid` and the dotted leader work.
- **Gaps and workarounds** (all md2book additions, recorded in the decision log):
  1. `@page chapter-a:nth(1 of chapter-a)` is ignored → a Paged.js handler (`afterPageLayout`)
     adds `chapter-first` to the page that contains `.chapter-head`; CSS
     `.pagedjs_page.chapter-first .pagedjs_margin { visibility: hidden }`.
  2. `string-set: booktitle attr(data-title)` on `body` is ignored → the build writes
     `@page :left { @top-left { content: "<title>" } }` with the title as a CSS string
     (backslash, quote and line breaks escaped).
  3. That rule outranks `@page :blank` → `.pagedjs_page.pagedjs_blank_page .pagedjs_margin
     { visibility: hidden }`.
  4. Paged.js marks an element split across pages with `data-align-last-split-element="justify"`
     so its last line stays justified; on a chapter `section` every child inherits it (headings,
     label and last lines justified) → `[data-align-last-split-element='justify']:not(p, li)
     { text-align-last: auto }`. After the fix, the chapter opening matches the reference.
  5. A code block split across pages gets a closed bottom border (reference: open). Accepted and
     recorded.
  6. A code block continued on the next page lost its line breaks and indentation (lines run
     together): Paged.js's `isIgnorable` drops whitespace-only text nodes, which is where the
     highlighter puts newlines and indentation. → patch: whitespace inside `<pre>` is not
     ignorable. With it, the 20-chapter book is 164 pages, the reference's count exactly, and the
     continued blocks read as in the reference.
  7. Paged.js's `Following` handler rewrites every rule with a `+` selector into
     `[data-following*=…]` rules in a stylesheet placed *before* the book's styles, so any sibling
     rule that overrides a same-specificity base rule is lost: all three terminal dots were red
     and the printed edition's hollow dots never applied. → patch: the rewrite is disabled, so
     `+` rules stay native and in cascade order. Paragraph indents after headings, tables and
     blocks still match the reference (the elements concerned never start a continuation page).
- **Patching**: patches 6 and 7 are exact string replacements applied to the pinned bundle when it
  is served (`src/pdf/paged.ts`); a unit test fails if either target text is not found exactly
  once, so an upgrade cannot silently drop them.
- **Start sequence** (fonts before layout): `PagedConfig = { auto: false }`; after load, await
  `document.fonts.ready` and every face's `load()`, then await `PagedPolyfill.preview()`
  (its `after` hook can fire before the last page exists), then `page.pdf`. Paged.js measures text while it paginates; starting it before the
  book's fonts are ready could paginate with fallback metrics on a slow machine. Measured output is
  byte-identical to the automatic start. Paged.js itself also loads every document font after adding the stylesheets
  and before layout (`Chunker.loadFonts`), so the pre-load is a second guard, not the only one.
- **Maintenance risk**: `pagedjs` 0.4.3 was last published in 2024. It is pinned exactly; its
  browser bundle `dist/paged.polyfill.js` (904 KB, no runtime Node dependencies used) is served into
  the page from `node_modules`. The workarounds and patches are covered by tests, so an upgrade or
  a switch to native Chromium features can be checked against them.

## R-02 Copied text / ToUnicode (plan-input R3)

- **Decision**: no ToUnicode rewrite. Chromium (Skia) writes `/Span << /ActualText … >> BDC`
  marked content for every cluster whose glyphs do not map one-to-one to characters (2,843 spans
  in `book-01`); extractors that honour ActualText get logical-order Burmese.
- **Evidence**: `pdftotext` (poppler) on our PDF gives `ကျွန်တော် ဘယ်လောက်ပေးရမလဲ။`
  exactly; the reference PDF's text is visual order with substitutes (`ကျဝန်ေတာ်`, `နှuန်း`).
  Zero U+FFFD in both. `pdfjs` ignores ActualText (glyph text has U+0000); PDFium (WASM) and
  PyMuPDF honour it but duplicate fragments at span edges.
- **Consequence**: the report's fixed line about "visual glyph order" is replaced by one saying
  extracted Burmese is in logical order, and the sentence "zero-width spaces are extracted as
  U+200B" by one saying they are not: Chromium keeps the syllable-break U+200B out of the PDF text
  (0 in the 163-page book), so copied text has none (decision log).

## R-03 Burmese line breaking (plan-input R4)

- **Decision**: port `add_syllable_breaks` unchanged (U+200B before syllable-initial consonants,
  outside tags, `pre` and `code`), always on; no config flag.
- **Evidence**: without it, Chromium's line breaker leaves visibly large gaps in justified Burmese
  (for example `program   တစ်ခု   နားလည်လောက်အောင်   တိတိကျကျ`); with it the pages match the
  reference. The regex matches only Myanmar characters, so English books are unaffected.
  Removing the breaks does not change the ActualText behaviour (R-02).

## R-04 Reading PDFs in QA (plan-input R5)

- **Decision**:
  - **Text**: `pdfjs-dist` text items with marked content, merged with the ActualText strings
    read from each page's content streams via `pdf-lib`: a span's text is its ActualText,
    placed at its first glyph; items are grouped into lines by baseline (`transform[5]`, 2 pt
    tolerance) and lines ordered top to bottom. Both the hex (`<FEFF…>`) and literal (`(ff)`)
    ActualText forms are decoded; content streams must be FlateDecode (anything else is an error).
    Measured on the 163-page book: the characters of every page equal `pdftotext`'s except
    one line-end hyphen that `pdftotext` drops; chapter openings give the lines `အခန်း (၁)`,
    `Synthetic Chapter 1`; 0 U+0000, 0 U+FFFD.
  - **Sample renders**: `pdfjs-dist` page render at 110/72 scale on its canvas factory
    (`@napi-rs/canvas`, already an optional dependency of `pdfjs-dist`, declared directly),
    written as PNG. 8 pages in 1.2 s.
  - **Fonts and page size**: `pdf-lib` (`/Resources /Font → /BaseFont`; MediaBox width and
    height). Names differ from the reference by renderer (`AAAAAA+NotoSansMyanmar-Bold` vs
    `NDPTJD+Noto-Sans-Myanmar-Bold`) and ours has no Verdana fallback; recorded, not a bug.
- **Alternatives**: `mupdf` (AGPL, rejected for an MIT package); `@hyzyla/pdfium` (duplicates
  text at span edges); `pdftotext` (system binary; used only as a development oracle in tests
  when on PATH, never at runtime).

## R-05 Page size and metadata

- **Decision**: after `page.pdf`, a `pdf-lib` pass sets every page's MediaBox and CropBox to exactly
  481.89 × 680.31 pt (170 × 240 mm), anchored at the top edge where Chromium lays out; removes
  `/CreationDate` and `/ModDate`; sets `/Producer` and `/Creator` to `md2book`; saves without
  object streams.
- **Reading the size back**: page height = MediaBox `y2 − y1` (after normalisation `y1` is
  negative, `h − 680.31`); reading `y2` alone gives 239.9 mm.
- **Evidence**: Chromium rounds the page to 481.92 × 679.92 pt (239.9 mm) whatever size is
  requested (CSS mm, CSS pt, `page.pdf` width/height). After the pass the size reads
  170.0 × 240.0 mm and two builds are byte-identical; ActualText extraction is unchanged.

## R-06 Page-count drift (plan-input R6)

- **Measured** (with the patches of R-01): 20-chapter book 164 pages, the reference's count
  exactly (163 before patch 6); `book-01` 11 vs 12 before the patches (one page; ±2% of 12 is less
  than a page), hence SC-001's "±2%, at least ±1 page" (spec clarification). Contents numbers
  identical for all 20 chapters. The equivalence script measures this with the reference's code
  line height 1.4 and reports the effect of 1.7 separately.

## R-07 Performance (plan-input R7)

- **Measured**: Paged.js layout + PDF of the 163-page book in 3.8 s (whole book in one document;
  no per-chapter merging). SC-005 (PDF + EPUB + QA of 20 chapters < 2 minutes) has wide margin;
  QA sample rendering adds about 1–2 s.

## R-08 Stylesheets

- **Decision**: carry `publish/css/print.css` and `printed.css` byte-for-byte to
  `assets/css/print.css` and `assets/css/printed.css` (hashes in the decision log), then add,
  each marked as an md2book addition and guarded by a test:
  - `print.css`: `pre { line-height: 1.7; }` (FR-018) and `h3, h4, h5, h6 { break-after: avoid; }`
    (FR-019, R-11);
  - `printed.css`: the three terminal window-control icons, close (×), minimise (−) and zoom (+), as
    centred SVG background images on `.terminal-bar .terminal-dot:nth-child(1..3)`, dark on a grey
    dot (FR-008; CSS bars were pushed off-centre by pixel snapping at this size);
  - `print.css`: more line spacing between contents entries (author request);
  - a separate `assets/css/paged.css` with the Paged.js workarounds of R-01, and
    `assets/paged-handler.js` with the chapter-first handler.
  The configured font set is applied with `substituteFonts` (the carried `print.css` names the
  `my-sans` files and families like `epub.css`). The generated per-book rules (left header title;
  `running_headers: false` → the reference's `content: none` rule) are appended last.

## R-09 Serving the document to Chromium

- **Decision**: the print HTML is loaded from a virtual origin (`http://md2book.local/`) whose
  requests are answered by Playwright's `page.route` from memory and disk: the stylesheets, the
  Paged.js bundle and handler, the set's font files, the cover and the end image. Any request for
  an unknown path fails the build (FR-007, FR-015). The intermediate HTML written to `src/`
  references those root-relative paths.
- **Rationale**: Paged.js fetches stylesheets and fonts need CORS-clean loads; `file://` pages
  would need Chromium flags. Worked unchanged for the whole spike.

## R-10 Front matter, contents and chapter markup

- **Decision**: reuse `frontMatterHtml` (feature 003, configurable licence, typeface and
  strings), `tocListHtml(parts, chapters, "#{slug}")` and the rendered chapter HTML; chapter
  sections `class="chapter group-a|group-b[ recto]" id="chNN"` as the reference; `fit_pre_blocks`
  ported with the reference constants (123 mm, 8.3/6.0 pt, 0.6 em; longest line in code points of
  the tag-stripped, unescaped text); `<html lang>` from the config language.

## R-12 Page numbers from chapter one (FR-022)

- Paged.js turns `#ch01 { counter-reset: page 1 }` into a reset on that page's box. Its
  `target-counter` (contents) honours it, but Chromium scopes the reset to that box: the following
  boxes kept counting from the cover (page 6 of the demo showed 5, not 2). **Decision**: the page
  handler writes each page's number (from chapter one, in the book's digits) as a CSS variable
  that the folio margin boxes display; the contents keep `target-counter(…, page, myanmar)`.

## R-11 Headings keep 2 lines of their content (User Story 5)

- **PDF**: a sweep of 28 heading positions near page feet (paragraph and code block after the
  heading) gave 0 violations: each heading either kept ≥ 2 following lines or moved to the next
  page. This comes from `break-after: avoid` on `h2` (carried `common.css`) and `orphans: 2`
  (paragraphs; the initial value elsewhere). **Decision**: an md2book addition in `print.css`
  extends `break-after: avoid` to `h3`–`h6`; the sweep becomes a fixture test.
- **Web** (CSS columns, as the reader): Chromium 0 violations of 40; WebKit 8 of 40 (headings left
  at a column foot with 0 or 1 lines after them: WebKit does not honour `break-after: avoid` in
  columns). **Decision**: the reader, after every layout in `measure()`, checks each heading in
  document order and, when fewer than 2 line boxes of the next element share its column, adds a
  class `keep-with-next` (`break-before: column`) and re-measures from there; classes are cleared
  before each re-pagination (text size, resize). With it WebKit gave 0 of 40. `web.css` also
  extends `break-after: avoid` to `h3`–`h6`. Both are md2book additions (reader edit guarded by
  `test/unit/web/reader-script.test.ts`).
