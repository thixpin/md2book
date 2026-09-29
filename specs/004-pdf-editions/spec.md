# Feature Specification: PDF Editions

**Feature Branch**: `004-pdf-editions` (no git branch created)

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "PDF (delivery slice 3 of reference/docs/spec.md): `md2book build pdf
--config <path> [--out <dir>] [--printed]` builds the 170 × 240 mm screen PDF (US-5) and the
printed edition (US-6: no cover, colour removed, grayscale-readable; plus the author's request
that the three terminal title-bar dots carry icons — dot, minus, diagonal — since colour is
removed), the PDF part of US-11 (gated end image as the last page), the PDF section of the QA
report (US-8 §5), and `md2book build all` gains the PDF step. Behaviour must match the Python
toolchain's build.py build_pdf, css/print.css, printed.css and qa.py pdf_checks at d235dbd.
Open decisions: page-count tolerance against the Python PDF and the full-build time target."

Values from the Python toolchain are cited as **[REF §n]**; the ones this feature needs are copied
into `data-model.md` → Reference constants during planning.

## Clarifications

### Session 2026-09-29

- Q: How close must the page count of `book-01` be to the Python PDF's? → A: Within ±2%.
- Q: Which line height do code and terminal blocks use in the PDF editions? → A: 1.7, as in the
  EPUB and web editions (a recorded difference from the reference's 1.4).
- Author request (added during planning): a section heading must never end a page (PDF) or a
  page of the web reader with fewer than 2 lines of its following content below it; if it cannot
  keep 2 lines, it moves to the next page with its content (User Story 5).
- Author request (during implementation): PDF page numbers follow the web reader: page 1 is
  chapter one's first page (the front matter is not numbered), folios sit in the outside corner
  (bottom left on left pages, bottom right on right pages), and books with Myanmar digits
  (`strings.chapter_digits`) number pages and contents entries in Myanmar digits (FR-022).
- Author request (during implementation): the printed dots show the macOS window-control icons
  ×, −, + (replacing dot, minus, diagonal); the PDF contents entries get more line spacing.
- Planning finding: ±2% of `book-01`'s 12 pages is less than one page, so SC-001 allows at least
  ±1 page and adds a 20-chapter book (research R-06).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build the screen PDF (Priority: P1)

An author builds a 170 × 240 mm PDF of the whole book with its cover, to proof it and share it.

**Why this priority**: The PDF is the book's typeset master; the printed edition and the PDF QA
checks build on it.

**Independent Test**: Build the fixture books and inspect the PDF's page size, page order, front
matter, contents numbers, headers, folios and chapter openings, and the extracted text.

**Acceptance Scenarios**:

1. **Given** a valid config, **When** the author runs `md2book build pdf --config book.json`,
   **Then** `<out>/<output_name>-170x240.pdf` is written and the intermediate HTML is kept at
   `<out>/src/book-print.html`.
2. **Given** the built PDF, **When** its pages are measured, **Then** every page is 170 × 240 mm;
   text sits inside margins of top 20, bottom 22, inside 24 and outside 18 mm, mirrored for left
   and right pages **[REF §5]**.
3. **Given** the built PDF, **When** its pages are listed, **Then** the order is: the cover image
   filling the whole page with no margins, the title page, the copyright page, the contents, the
   chapters, and the end image page when enabled (User Story 3).
4. **Given** the title and copyright pages, **When** they are read, **Then** they carry the same
   text as the EPUB front matter (title, subtitle, author, publisher; copyright line, licence
   text, publisher and ISBN when set, typeface line) **[REF §6]**, and front matter pages have no
   running header and no page number.
5. **Given** the contents page, **When** it is read, **Then** it has the configured contents
   heading, entries nested by part when the book has parts, and each chapter entry shows, after
   a dotted leader, the number of the page the chapter actually starts on, counted from chapter
   one (FR-022).
6. **Given** any chapter, **When** its first page is found, **Then** it starts on a new page with
   no running header and no page number; with `recto_chapter_start: true` it starts on a
   right-hand (odd) page, with a blank page inserted before it when needed; blank pages have no
   header and no number.
7. **Given** body pages, **When** their margins are read, **Then** the header shows the author at
   the outside and the current chapter title at the inside, and the footer shows the page number
   at the outside and the book title at the inside (outside = left on left pages, right on right
   pages; FR-022, FR-023); with `running_headers: false` the header line is gone and the footer
   stays.
8. **Given** body text, **When** its type is measured, **Then** it is 11 pt, line height 1.55,
   justified, with a 6 mm first-line indent, no indent after headings and blocks, and no space
   between paragraphs **[REF §5]**.
9. **Given** a section heading, terminal block, table or callout near a page end, **When** the
   book is paginated, **Then** no heading is left alone at the foot of a page, none of those blocks
   is split across pages, and paragraphs keep at least 2 lines at a page's foot and head.
10. **Given** a terminal or code block, **When** it is typeset, **Then** its font size is chosen so
    its longest line fits the text measure, between 6.0 and 8.3 pt; a line still too long at
    6.0 pt wraps instead of overflowing **[REF §5]**.
11. **Given** justified Burmese prose, **When** it is typeset, **Then** lines break only between
    syllables, never inside one, and no line shows visibly large word gaps; code and inline code
    are not affected.
12. **Given** the built PDF, **When** its text is copied or extracted, **Then** it has zero U+FFFD
    replacement characters, no letters absent from the source, and Burmese characters that come
    from the book's own fonts; all used fonts are embedded.

---

### User Story 2 - Build the printed edition (Priority: P1)

An author builds a black-and-white interior for a print shop, which prints the cover separately.

**Why this priority**: The printed book is a primary deliverable and must print well without
colour.

**Independent Test**: Build with `--printed`, check that the first page is the title page, and
check that terminal, code, table and callout styling uses no colour but stays readable in
grayscale, including the terminal title-bar dots.

**Acceptance Scenarios**:

1. **Given** a valid config, **When** the author runs `md2book build pdf --config book.json
   --printed`, **Then** `<out>/<output_name>-170x240-printed.pdf` is written and its intermediate
   HTML is kept at `<out>/src/book-printed.html`.
2. **Given** the printed PDF, **When** its pages are listed, **Then** there is no cover page: the
   title page is page 1 and everything else follows the screen PDF's order and layout.
3. **Given** code, terminal, table and callout blocks, **When** the printed PDF is rendered,
   **Then** they carry no colour: code in black with comments and strings in greys, terminals on
   white with a thin dark outline, a light grey title bar, a bold black prompt and grey output,
   and tables and callouts without background fills and with black rules **[REF §5]**.
4. **Given** a terminal block in the printed PDF, **When** its title bar is viewed, **Then** its
   three dots carry, from left to right, the window-control icons close (×), minimise (−) and
   zoom (+), dark on grey like the macOS controls, so they stay recognisable without colour (author
   addition to the reference).
5. **Given** the printed PDF, **When** each page is converted to grayscale, **Then** all text,
   including code tokens and terminal output, remains legible against its background.

---

### User Story 3 - Gated end image in the PDF (Priority: P2)

An author adds a closing illustration that appears in the PDF only once the final chapter exists.

**Why this priority**: Enhancement; the EPUB already honours the same gate (feature 003).

**Independent Test**: Build with and without the gate file present and check the last page.

**Acceptance Scenarios**:

1. **Given** `end_image` is set and the `end_image_after` chapter file exists, **When** either PDF
   is built, **Then** the last page holds only the image, centred and scaled to fit, with no
   header or page number, and the build log says `End image: included`.
2. **Given** the gate file is missing or `end_image` is unset, **When** either PDF is built,
   **Then** the image appears nowhere in the PDF or its intermediate HTML and the log says it is
   withheld and why, with the same wording as the EPUB build.

---

### User Story 4 - PDF checks in the QA report (Priority: P1)

An author reviews the PDF section of `QA-REPORT.md` before sending the book out.

**Why this priority**: The report is the author's proof that the PDF is complete and its text is
correct; until now it says `PDF not built.`

**Independent Test**: Build a fixture PDF, run `md2book qa`, and compare the PDF section with
the PDF's known facts; check the sample images.

**Acceptance Scenarios**:

1. **Given** a built screen PDF, **When** the author runs `md2book qa --config book.json`,
   **Then** the report's PDF section lists: file name, edition (screen), page count, page size in
   mm to one decimal (target 170 × 240), the embedded fonts, the fixed body and margin lines,
   chapter opening pages detected (of N), nearly empty pages, the extracted character count
   against the manuscript's, and the extraction check (U+FFFD count and the most frequent stray
   characters) **[REF §8]**.
2. **Given** `--printed` on `qa`, **When** the report is written, **Then** it checks the printed PDF
   and names the edition as printed; its front matter is title, copyright and contents (no cover).
3. **Given** a chapter opening page, **When** QA scans the PDF, **Then** the page is detected when,
   within its first 6 lines, a line equal to the chapter label is directly followed by a line equal
   to its title, on a page with fewer than 40 lines **[REF §8]**.
4. **Given** pages after the front matter with 3 non-empty lines or fewer, **When** QA runs,
   **Then** they are listed with their line counts; otherwise the line says `none`.
5. **Given** the PDF, **When** QA runs, **Then** page images at 110 dpi are written to
   `<out>/qa-pages/` as `page-{NNN}-{name}.png` for each front matter page, the first chapter's
   opening and next two pages, the middle chapter's opening and next page, the last chapter's
   opening and the last page; the folder is rebuilt on each run **[REF §8]**.
6. **Given** no PDF of the requested edition exists, **When** QA runs, **Then** the PDF section
   says `PDF not built.` as before.
7. **Given** a valid config, **When** the author runs `md2book build all --config book.json
   [--printed]`, **Then** the PDF of that edition, the EPUB, the web edition and the QA report are
   built, in that order; the web step is skipped with a log line when `web_published_chapters`
   is not set.

---

### User Story 5 - Headings stay with their content, in PDF and web (Priority: P1)

A reader never finds a section heading alone at the bottom of a page, or with a single line of its
section under it, in the PDF or in the web reader.

**Why this priority**: Author request; a stranded heading looks like a layout fault in a printed
book and in the paged web reader alike.

**Independent Test**: Build a fixture chapter whose headings fall at every position near a page
foot (PDF) and a page foot of the web reader (in Chromium and WebKit, at several text sizes), and
check each heading's page: it has at least 2 lines of its following content below it, or it
starts the next page.

**Acceptance Scenarios**:

1. **Given** a section heading (levels 2 to 6 in the chapter body) that would fall at a page foot
   with no line, or only one line, of its following content below it, **When** either PDF edition
   is built, **Then** the heading starts the next page together with its content.
2. **Given** a heading followed by a code block, list, table, terminal or callout, **When** the
   book is paginated, **Then** the same rule holds: at least 2 lines of that block (or the whole
   unbreakable block) are on the heading's page.
3. **Given** the same chapter in the web reader, **When** it is paginated in Chromium or WebKit,
   and again after the reader changes the text size or the window size, **Then** no page ends with
   a heading followed by fewer than 2 lines of its content.
4. **Given** a heading that already has 2 or more lines of content below it, **When** the book is
   paginated, **Then** it stays where it is (no page is shortened needlessly).

---

### Edge Cases

- A book without parts: the contents is a flat list; with parts, part rows are bold and chapter
  rows indented.
- Recto start with a chapter that ends on a right-hand page: a blank left page is inserted, with
  no header or number.
- A terminal line longer than the measure at 6.0 pt: it wraps; nothing runs into the margin.
- A heading at the end of a chapter page that cannot fit with its first lines: it moves to the
  next page, leaving a short page (listed by QA as nearly empty; expected, per the known
  limitations section).
- Characters outside the book's fonts (emoji, the warning sign): drawn with a system fallback
  font; listed by QA's coverage and stray-character checks.
- An English book (`language: en`): no syllable breaking; labels, contents heading and typeface
  line come from its strings; checks work the same.
- Fonts not installed: the build stops with the one-line message naming `md2book fonts`.
- The browser engine needed to typeset the PDF is not installed: the build stops with one line
  naming the install command.
- The middle or last chapter opening is not detected: its samples are skipped; the page and
  last-page samples are still written.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `md2book build pdf --config <path> [--out <dir>] [--printed]` MUST build the screen
  PDF, or the printed edition with `--printed`; `--out` defaults as for the other commands.
- **FR-002**: The screen PDF MUST follow the page geometry, typography, page order, front matter,
  contents, chapter start, running header, folio and keep-together rules of US-1 **[REF §5,
  §6]**.
- **FR-003**: Contents page numbers MUST be the real start pages of the chapters in the final PDF.
- **FR-004**: Each terminal and code block MUST get the font size `clamp(6.0, 8.3, 123 mm /
  (longest line × 0.6 em))` in points, written to the intermediate HTML **[REF §5]**.
- **FR-005**: Burmese prose MUST break only at syllable boundaries in the PDF; any break
  opportunities the build adds MUST exist only in the intermediate HTML, never in the manuscript,
  and never inside `pre` or `code`.
- **FR-006**: The PDF's extractable text MUST contain zero U+FFFD characters and only non-ASCII
  characters that occur in the manuscript or front matter (U+200B excepted).
- **FR-007**: All fonts from the configured font set MUST be embedded; the build MUST use only the
  configured set's files for book text, never system copies of the same families.
- **FR-008**: The printed edition MUST omit the cover page, remove all colour from code, terminal,
  table and callout styling as in US-2, and draw the icons ×, − and + in the three
  terminal title-bar dots.
- **FR-009**: The end image MUST be the PDF's last page, alone, unnumbered and without header,
  exactly when the feature 003 gate says so; the build log line MUST match the EPUB build's.
- **FR-010**: The intermediate HTML MUST be written to `<out>/src/book-print.html` or
  `<out>/src/book-printed.html` and rebuilt on every run.
- **FR-011**: `md2book qa` MUST accept `--printed` and replace `PDF not built.` with the PDF
  section of US-4 when that edition's PDF exists; the `Em dash on pages` line is not written
  (consistent with feature 003's removal of em dash checks).
- **FR-012**: QA MUST write the sample page images of US-4 scenario 5 to `<out>/qa-pages/`,
  replacing its previous contents.
- **FR-013**: `md2book build all` MUST build the PDF (edition per `--printed`), then the EPUB,
  then the web edition (skipped with `Web edition: skipped (web_published_chapters is not set)`
  when the key is absent), then the QA report, and log each output path. Editions are built with
  `md2book build <pdf|epub|web|all>`; `init`, `fonts`, `qa` and `serve` stay top-level.
- **FR-014**: The public API MUST gain exactly one function, `pdf()`, mirroring the command;
  `all()` and `qa()` gain the `printed` option.
- **FR-015**: Missing fonts, a missing cover, a missing typesetting browser, or a failed render
  MUST stop the build with a one-line message and a non-zero exit; no partial PDF is left at the
  output path.
- **FR-016**: Two builds of the same input MUST produce byte-identical PDFs; the PDF carries no
  creation or modification date (Constitution VII).
- **FR-017**: The build MUST NOT access the network; the reference's `print.css` and `printed.css`
  MUST be carried over, with every deliberate change recorded in `docs/decision-log.md`.
- **FR-018**: Code and terminal blocks in both PDF editions MUST use line height 1.7, as the EPUB
  and web editions do (a recorded difference from the reference's 1.4).
- **FR-019**: In both PDF editions, every section heading (levels 2–6 in the chapter body) MUST
  either have at least 2 lines of its following content on the same page or start the next page
  with that content (User Story 5).
- **FR-020**: The web reader MUST apply the same rule to its pages in Chromium and WebKit, on the
  first layout and on every re-pagination (text size, window size, orientation).
- **FR-021**: The rule MUST NOT change the manuscript or the rendered chapter HTML used by the
  EPUB; it is layout only.
- **FR-022**: Page numbers (folios and contents entries) MUST count from 1 on chapter one's first
  page, leave the front matter unnumbered, sit at the bottom outside corner (left pages left, right
  pages right), and use the digits of `strings.chapter_digits` (Myanmar or ASCII), as the web
  reader does (a recorded difference from the reference's centred, whole-document numbers).
- **FR-023**: Running heads and feet MUST follow the author's layout in the PDF and the web reader:
  header with the author at the outside and the current chapter title at the inside, footer with
  the page number at the outside and the book title at the inside, all in the page number's type
  (9 pt in the PDF); `running_headers: false` removes the header line only.

### Key Entities *(include if feature involves data)*

- **PDF edition**: screen or printed; decides the file name, whether the cover page is present,
  the extra stylesheet and the QA front matter names.
- **Print document**: the intermediate HTML of one edition: front matter, chapter sections with
  alternating page groups and recto flags, fitted `pre` sizes, syllable break opportunities, and
  the optional end image page.
- **PDF facts**: what QA reads back from a PDF: page count and size, fonts, per-page text, chapter
  start pages, short pages, extraction counts and sample images.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Compared with the Python toolchain's PDF of the same book: page size identical,
  page count within ±2% but at least ±1 page (measured on `book-01` and on a 20-chapter book both
  toolchains build), all N chapter openings detected, each on a right-hand page when recto start
  is on. The page-count comparison measures engine drift only: it uses a build with the
  reference's 1.4 code line height; the pages added by FR-018 are reported separately and
  recorded in the decision log.
- **SC-002**: Extracted text of the Burmese and English fixtures and `book-01` has 0 U+FFFD and no
  stray characters absent from the manuscript, in both editions.
- **SC-003**: Every contents page number equals its chapter's detected start page (counted from
  chapter one), for every
  fixture, in both editions.
- **SC-004**: The printed edition contains no coloured pixels in terminal, code, table or callout
  areas of the sample renders (every pixel's colour channels differ by at most a small tolerance),
  and its title page is page 1.
- **SC-005**: Building PDF + EPUB + QA for a 20-chapter book finishes in under 2 minutes on the
  CI runner.
- **SC-006**: A human side-by-side review of the Python and md2book sample renders (cover, title
  page, first chapter opening, a page with a terminal block) finds no layout regression; the
  result is recorded in the decision log.
- **SC-007**: On the heading-position fixture, zero headings violate FR-019 in either PDF
  edition, and zero violate FR-020 in Chromium and WebKit at the smallest, default and largest
  text sizes.

## Assumptions

- `recto_chapter_start`, `running_headers`, `end_image`, `end_image_after` and `strings` are the
  existing config keys (feature 001); no new config keys are needed unless planning shows the
  syllable-break behaviour must be switchable.
- The PDF uses the same chapters as the EPUB and QA (the whole chapter glob, not the web
  allow-list), as in the reference.
- The reference's glyph-name ToUnicode repair is WeasyPrint-specific; this feature is accepted on
  its outcome (FR-006), not on a port of that repair.
- Fixed report sentences that describe the reference renderer's behaviour (for example visual
  glyph order in extracted Burmese) are kept only when true of the new PDFs; changes are recorded
  in the decision log.
- The typesetting browser is the one already installed for the web edition's tests; users install
  it once with the documented command.
- The cover image is the configured `cover` file; cover generation from HTML is feature `cover`
  (slice 6), not this one.
