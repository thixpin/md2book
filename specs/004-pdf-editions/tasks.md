---

description: "Task list for PDF Editions (delivery slice 3) and the shared heading rule"
---

# Tasks: PDF Editions

**Input**: `specs/004-pdf-editions/` (plan, spec, research, data-model, contracts, quickstart)

**Tests**: REQUIRED (Constitution VI): each test task is written and seen failing before its
implementation. Offline; Chromium via Playwright as in the web slice; `pdftotext`-based assertions
skip with a note when it is not on PATH.

**Reference values**: `data-model.md` → Reference constants; `contracts/pdf-output.md`,
`contracts/qa-pdf.md`, `contracts/cli.md`.

**CLI**: editions are built with `md2book build <pdf|epub|web|all>` (commit `0cdf403`); `build pdf`
is currently reserved and becomes real in US1.

**Public API (Constitution VIII)**: `src/index.ts` gains exactly `pdf`; `qa` and `all` gain
`printed`.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Add `pagedjs` `0.4.3` (exact), `pdf-lib@^1.17`, `pdfjs-dist@^6.3`, `@napi-rs/canvas@^1.0` to dependencies in `package.json`; add script `equivalence:pdf` (`node scripts/equivalence-pdf.ts`)
- [X] T002 [P] Carry over `development-book/publish/css/print.css` and `css/printed.css` byte-for-byte to `assets/css/print.css` and `assets/css/printed.css`; record both SHA-256 values in `docs/decision-log.md`
- [X] T003 [P] Create `test/fixtures/book-headings/` (Burmese config with `web_published_chapters` for all chapters, 1×1 cover, one part): chapters whose `##`/`###`/`####` headings fall at every offset near a page foot (filler paragraphs of 1–12 lines before each heading), each heading followed in turn by a paragraph, a code block, a list, a table, a terminal and a callout; add a unit test that the fixture loads and renders

---

## Phase 2: Foundational (blocking for all stories)

- [X] T004 [P] Write `test/unit/pdf/document.test.ts`: `fitPreBlocks` gives `style="font-size: {pt:.2f}pt"` with `pt = max(6.0, min(8.3, 123.0 / (max(longest, 1) × 0.6 × 25.4 / 72)))`, longest line in code points after removing tags and decoding entities (cases: short line → 8.30pt, 80 chars, 200 chars → 6.00pt, entity `&lt;` counts 1); `addSyllableBreaks` inserts U+200B at `(?<=[က-႟])(?<!္)(?=[က-အ](?![်္]))` only outside tags, `<pre>…</pre>` and `<code>…</code>` (known Burmese strings with kinzi, medials, stacked consonants; English unchanged)
- [X] T005 Implement `src/pdf/document.ts` `fitPreBlocks` and `addSyllableBreaks` to pass T004
- [X] T006 [P] Write `test/unit/pdf/paged.test.ts`: `pagedBundle()` returns the pinned `pagedjs/dist/paged.polyfill.js` with both patches of research R-01 applied exactly once (whitespace inside `<pre>` not ignorable; `Following` rewrite disabled); throws when either target text is not found exactly once (simulated with a modified source)
- [X] T007 Implement `src/pdf/paged.ts` `pagedBundle()` to pass T006
- [X] T008 [P] Write `test/unit/pdf/stylesheets.test.ts`: `printStylesheets(set, config, printed)` returns, in order, `common.css`, `print.css`, (`printed.css` when printed), `paged.css`, `book.css`; `print.css` equals the carried file plus exactly the md2book additions `pre { line-height: 1.7; }` and `h3, h4, h5, h6 { break-after: avoid; }`; `paged.css` holds the three rules of contracts/pdf-output.md; `book.css` has `@page :left { @top-left { content: "<title>"; } }` with `\\`, `"` and line breaks escaped, plus `@page :left{@top-left{content:none}} @page :right{@top-right{content:none}}` only when `running_headers` is false; `substituteFonts` applied for `en-serif`, identity for `my-sans`
- [X] T009 Create `assets/css/paged.css` and `assets/paged-handler.js` (`afterPageLayout(page)` adds `chapter-first` when `page.querySelector(".chapter-head")`); add the `print.css` md2book additions (each `/* md2book: … */`); implement `src/pdf/stylesheets.ts` to pass T008
- [X] T010 [P] Write `test/unit/pdf/normalise.test.ts`: on a small PDF made with `pdf-lib`, `normalisePdf(bytes)` sets every page's MediaBox and CropBox to `[0, h − 680.31, 481.89, h]` (width/height 481.89 × 680.31 pt), removes `/CreationDate` and `/ModDate`, sets `/Producer` and `/Creator` to `md2book`; the same input twice gives identical bytes
- [X] T011 Implement `src/pdf/normalise.ts` to pass T010
- [X] T012 [P] Write `test/unit/pdf/render.test.ts` (Chromium): `renderPdf({ html, files })` serves only the given paths from `http://md2book.local/`, rejects with `md2book: pdf: unexpected request <path>` for any other request, loads Paged.js with `auto: false`, awaits fonts before `PagedPolyfill.preview()` (assert via a page-side log of call order), and returns PDF bytes of a 2-page test document; Chromium missing → `md2book: pdf: Chromium is not installed; run: npx playwright install chromium`
- [X] T013 Implement `src/pdf/render.ts` (Playwright `page.route`, start sequence of contracts/pdf-output.md, 10-minute limit → `md2book: pdf: page layout did not finish`) to pass T012

**Checkpoint**: a print HTML string can be rendered to a normalised PDF.

---

## Phase 3: User Story 1 - Build the screen PDF (P1) 🎯 MVP

**Goal**: `md2book build pdf` writes the 170 × 240 mm screen PDF.
**Independent test**: build `book-mm` and `book-en`; inspect size, page order, contents numbers, headers, folios, chapter starts, extracted text.

### Tests ⚠️

- [X] T014 [P] [US1] Write `test/unit/pdf/print-document.test.ts`: `printDocument(book, { printed: false, endImage })` equals the PrintDocument template of data-model.md: `<html lang>` from the config, `body data-title`, cover `<div class="cover-page"><img src="/book/cover{ext}" alt="Cover"/></div>`, front sections (title, copyright from `frontMatterHtml`, contents heading from `strings.contents_heading`, `tocListHtml(parts, chapters, "#{slug}")`), chapter sections `class="chapter group-a|group-b[ recto]" id="chNN"` (group-a for odd index, `recto` when `recto_chapter_start`), chapter head + `fitPreBlocks(addSyllableBreaks(html))`, pieces joined with `\n`
- [X] T015 [P] [US1] Write `test/integration/pdf.test.ts`: `buildPdf` on `book-mm` writes `<out>/book-mm-170x240.pdf` and `<out>/src/book-print.html`; page 1 is the cover; every page 170.0 × 240.0 mm (MediaBox `y2 − y1`); contents numbers equal the pages where each chapter's label and title lines appear; chapter openings and blank pages have no header or folio; left pages show the book title, right pages the chapter title; `running_headers: false` (temp config copy) removes both headers; 0 U+FFFD and 0 U+0000 in extracted text; two builds byte-identical; sources unchanged; missing fonts → one-line error naming `md2book fonts`; a failed render leaves no file at the output path; `pdftotext` oracle (when on PATH): each page's characters equal ours ignoring whitespace
- [X] T016 [P] [US1] Write `test/unit/qa/pdf-read.test.ts` (on a PDF built in the test): `pdfFacts(file)` gives pages, `sizeMm` from page `min(5, n − 1) + 1` rounded with `pyRound` to one decimal, sorted BaseFont names, per-page lines grouped by baseline (2 pt) top to bottom with ActualText spans replacing their glyph text (hex `<FEFF…>` and literal `(…)` with escapes); content streams decoded with pdf-lib (every standard filter). PDF tests use the full-shaping print font fixture `test/fixtures/fonts-print/` (`scripts/make-font-fixtures.py --print`): the coverage fixture's consonant-only fonts made Chromium fall back to system Myanmar fonts

### Implementation

- [X] T017 [US1] Implement `printDocument` in `src/pdf/document.ts` to pass T014
- [X] T018 [US1] Implement `src/qa/pdf-read.ts` `pdfFacts` (pdfjs-dist text items with marked content + pdf-lib content streams, fonts and boxes) to pass T016
- [X] T019 [US1] Implement `src/pdf/build.ts` `buildPdf(book, { out, printed, fontsDir?, manifestPath? })`: require fonts, write `src/book-print.html` (rebuilt), serve assets per data-model.md, render, normalise, write via temp file + rename; pass T015
- [X] T020 [US1] Implement `src/pdf/command.ts` `runPdf` (logs `PDF written: <file>`); replace the reserved `build pdf` in `src/cli.ts` with the real command (`--config`, `--out`, `--printed`); export `pdf()` from `src/index.ts`; public-API test = `all, epub, fonts, init, pdf, qa, serve, web`; update `test/unit/cli.test.ts` (only `cover` reserved)

**Checkpoint**: the screen PDF is complete and verifiable on its own.

---

## Phase 4: User Story 2 - Build the printed edition (P1)

**Goal**: `md2book build pdf --printed` writes the black-and-white print-shop interior.
**Independent test**: build `book-mm --printed`; page 1 is the title page; code/terminal/table/callout areas have no colour; the terminal dots carry icons.

- [X] T021 [P] [US2] Extend `test/unit/pdf/stylesheets.test.ts`: `printed.css` equals the carried file plus the md2book window-control icons (`.terminal-bar .terminal-dot:nth-child(1..3)` centred SVG icons: close ×, minimise −, zoom +, dark on a grey dot; revised from dot/minus/diagonal at the author's request)
- [X] T022 [P] [US2] Extend `test/integration/pdf.test.ts`: `--printed` writes `<out>/book-mm-170x240-printed.pdf` and `src/book-printed.html`; no cover (page 1 = title page, lines equal the title page's); rendered pages with a terminal, code block, table and callout (pdfjs render) have no pixel whose RGB channels differ by more than 8 inside those blocks' areas (SC-004); the icon shapes (×, −, +) are checked by eye on a zoomed render (done 2026-09-29) and in the SC-006 review
- [X] T023 [US2] Add the dot-icon rules to `assets/css/printed.css` (marked `/* md2book: … */`); make `printDocument` omit the cover and `printStylesheets` add `printed.css` when printed; pass T021 and T022

---

## Phase 5: User Story 4 - PDF checks in the QA report (P1)

**Goal**: `QA-REPORT.md` has a full PDF section and sample renders; `build all` builds the PDF first.
**Independent test**: build a fixture PDF, run `md2book qa`, compare the PDF section with contracts/qa-pdf.md; check `qa-pages/`.

### Tests ⚠️

- [X] T024 [P] [US4] Write `test/unit/qa/pdf-checks.test.ts` with synthetic `PdfFacts`: chapter start = first page (not yet assigned) with < 40 non-empty lines whose first 6 lines contain a line equal (trimmed) to the label directly followed by one equal to the title; short pages = page > front count with ≤ 3 non-empty lines; `textChars` = sum of page text length without Python `\s`; stray = code point > 0x7F, not U+1000–U+109F, category not P*/Z*, not `©` or U+200B, top 8 with first-seen tie order; sample names per data-model.md (screen fronts `cover,title,copyright,toc`, printed `title,copyright,toc`, `ch01-open/p2/p3`, `mid-chapter-open/p2` for chapter `len // 2`, `last-chapter-open`, `last-page`, later names win, pages outside 1…n dropped)
- [X] T025 [P] [US4] Write `test/unit/qa/report-pdf.test.ts`: the PDF section lines equal contracts/qa-pdf.md exactly for a given facts object (screen and printed edition line, `none` forms, Python list formatting `[(12, 2)]` and `[('×', 7)]` via `pyRepr`, `en-US` thousands separators); no `Em dash on pages` line; without a PDF the section is `- PDF not built.`
- [X] T026 [P] [US4] Write `test/integration/pdf-qa.test.ts`: after `md2book build pdf`, `md2book qa` writes the PDF section (170 x 240 mm, `Chapter opening pages detected: 2 of 2`, 0 replacement characters) and `qa-pages/page-001-cover.png`, `page-00N-ch01-open.png`, … `last-page.png` (110 dpi: width 736 px); `qa-pages/` rebuilt (a stray file disappears); `qa --printed` checks the printed PDF (edition line, no cover sample); `md2book build all` logs PDF, EPUB, web, QA in that order and `build all --printed` builds the printed PDF

### Implementation

- [X] T027 [P] [US4] Implement `src/qa/pdf-checks.ts` to pass T024
- [X] T028 [P] [US4] Implement `src/qa/pdf-samples.ts` `writeSamples(file, samples, dir)` (pdfjs render at 110/72 on its canvas factory, PNG, directory emptied first)
- [X] T029 [US4] Add the PDF section to `src/qa/report.ts` per contracts/qa-pdf.md to pass T025
- [X] T030 [US4] Extend `src/qa/command.ts`: `runQa` accepts `printed` and checks `<out>/<output_name>-170x240[-printed].pdf` when present; `runAll` = `runPdf` → `runEpub` → web (skipped when `web_published_chapters` is unset) → `runQa`, all with `printed`; add `--printed` to `qa` and `build all` in `src/cli.ts`; `qa()`/`all()` in `src/index.ts` accept `printed` and `all()` returns `pdf`; pass T026

---

## Phase 6: User Story 5 - Headings stay with their content, PDF and web (P1)

**Goal**: no page (PDF) or reader page (web) ends with a heading followed by fewer than 2 lines of its content.
**Independent test**: the `book-headings` fixture in both PDF editions and in the web reader (Chromium, WebKit) at three text sizes.

### Tests ⚠️

- [X] T031 [P] [US5] Write `test/integration/pdf-headings.test.ts`: build `book-headings` (screen and printed); for every page, any heading line (text of an `h2`–`h4` of the fixture) has ≥ 2 non-empty lines after it on the page (folio excluded) or is the first body line of its page; also assert at least one heading moved to a page top and one kept exactly 2 lines, so the fixture really covers the boundary (SC-007)
- [X] T032 [P] [US5] Write `test/e2e/headings.test.ts` (Chromium and WebKit): build and serve `book-headings`; for text sizes 85%, 100% and 150%, for every heading in the reader flow, at least 2 line boxes of its next element are in the heading's page column or the heading starts its page; re-check after a text-size change and after a viewport resize (SC-007)
- [X] T033 [P] [US5] Extend `test/unit/web/reader-script.test.ts` (READER_EDITS) with the heading-keep edit and `test/unit/web/assets.test.ts` with `h3, h4, h5, h6 { break-after: avoid; }` and `.keep-with-next { break-before: column; }` in `web.css`

### Implementation

- [X] T034 [US5] Add to `assets/css/web.css` (md2book additions) `.chapter-body h3, .chapter-body h4, .chapter-body h5, .chapter-body h6 { break-after: avoid; }` and `.keep-with-next { break-before: column; -webkit-column-break-before: always; }`
- [X] T035 [US5] Add to `assets/web-reader.js`, at the end of `measure()`: remove every `keep-with-next`; then, in document order, for each `h2`–`h6` in the flow, count the distinct line tops of its next element's client rects that share the heading's page column (pages counted from the heading's own column: WebKit's column positions drift from the computed pitch far into a book); when fewer than 2 (and the next element has lines), add `keep-with-next` and re-measure the page count; update the READER_EDITS guard; pass T032 and T033
- [X] T036 [US5] Confirm T031 passes with the `print.css` addition from T009 (no further PDF change expected per research R-11); if it fails, fix in `assets/css/print.css` and record why in `docs/decision-log.md`

---

## Phase 7: User Story 3 - Gated end image in the PDF (P2)

- [X] T037 [P] [US3] Extend `test/integration/pdf.test.ts`: with the `book-mm` gate present the last page holds only the end image (no header, no folio; image served as `/book/end{ext}`) and the log shows `End image: included`; with the gate missing (temp copy) the image is absent from the PDF and `src/book-print.html`, and the log shows `End image: withheld (chapter-02.md not in chapters/)`
- [X] T038 [US3] Use `endImage(config)` (feature 003) in `printDocument`/`buildPdf` and log its line in `runPdf`; pass T037

---

## Author changes during implementation

- [X] T043 [US1] Page numbers from chapter one, Myanmar digits for Myanmar books, folios in the outside corners (FR-022): `src/pdf/stylesheets.ts` (`book.css`), `assets/paged-handler.js` (`Folios`), `src/pdf/document.ts` (`data-folio-digits`); tests in `test/unit/pdf/stylesheets.test.ts`, `test/unit/pdf/print-document.test.ts`, `test/integration/pdf.test.ts`
- [X] T044 [US2] Printed terminal icons as the macOS window controls (×, −, +), centred SVGs on round grey dots; more room between contents entries (`assets/css/printed.css`, `assets/css/print.css`)
- [X] T045 Smaller web chapter title (`assets/css/web.css`, author request)

## Phase 8: Polish

- [X] T039 [P] Write `scripts/equivalence-pdf.ts` (SC-001): copy `development-book` to a temp dir; generate a 20-chapter book there from `book-01`'s chapter (4 parts, `recto_chapter_start: true`); build `book-01` and it with Python `build.py pdf` and with ours (with an internal extra stylesheet `pre { line-height: 1.4; }` for the page-count comparison, and again without it to report FR-018's extra pages); compare page size, page count within ±2% but at least ±1 page, N of N chapter openings on right-hand pages, 0 U+FFFD, stray characters only from the manuscript
- [X] T040 [P] Write `test/integration/pdf-perf.test.ts`: `build all` (PDF + EPUB + web + QA) of a 20-chapter synthetic book (in a temp dir) < 120 s without epubcheck (SC-005)
- [X] T041 Update `README.md` (`build pdf`, `--printed`, `qa --printed`, `build all`, Chromium requirement) and `docs/decision-log.md`: Paged.js engine and its four CSS workarounds and two bundle patches, code line height 1.7 in PDF, terminal-dot icons, logical-order extraction and zero-width-space sentences, font names, closed border on split code blocks, no em dash line, samples path relative to the report, heading rule (PDF addition and reader pass), `book-01` page-count drift
- [ ] T042 Run `npm run check`, `npm run test:e2e`, `npm run equivalence:pdf` (with `DEVBOOK`) and the quickstart; build the demo book's PDFs and render its QA samples; SC-006 visual review of Python vs md2book samples (cover, title page, first chapter opening, a terminal page) recorded in `docs/decision-log.md`

## Dependencies

Setup → Foundational → US1 → US2 (reuses the build) → US4 (needs a PDF) → US5 (PDF part needs
US1; web part is independent of the PDF and can start after Foundational) → US3 → Polish.

## Parallel examples

- Foundational: T004, T006, T008, T010, T012 (different test files) together; then T005, T007,
  T009, T011, T013.
- US1: T014, T015, T016 together.
- US4: T024, T025, T026 together; T027 and T028 together.
- US5: T031, T032, T033 together; the web tasks T034–T035 can run while US4 is in progress.

## Implementation strategy

MVP = Phases 1–3 (the screen PDF via `md2book build pdf`). Then the printed edition, the QA
section with `build all`, the heading rule, the end image, and the equivalence and polish work.
Commit after each task or group (project convention).
