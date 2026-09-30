# Feature Specification: Page Size, Font Size and Font Family Presets, and a Guided init

**Feature Branch**: `006-page-and-font-presets` (no git branch created)

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Add preset page sizes, font sizes, Myanmar font families, and an
improved init configuration flow. (1) PDF page size presets: default 170 × 240 mm, a5
148 × 210 mm, b5 176 × 250 mm, a4 210 × 297 mm, letter 216 × 279 mm; no custom dimensions.
(2) Font size presets xs, s, m, l, xl; default m, which must preserve the current typography
exactly; applied consistently to body text, headings, code, tables, callouts and other PDF
typography; no custom sizes. (3) If technically feasible, Myanmar font families Noto Sans
Myanmar (default), Myanmar Census, Masterpiece Uni Round, NamKhone Unicode and Padauk,
selectable from the config (`font: { family: noto-sans-myanmar, size: m }`) and from the init
wizard as predefined choices. A family is officially supported only after it passes shaping,
vowel-sign and stacking, Latin, bold/italic, line-breaking and pagination, PDF embedding,
code/terminal and licensing checks; fonts are not bundled or redistributed unless their licence
allows it — otherwise they are usable only when available locally, or with a documented
installation step. (4) `md2book init` first asks 'How would you like to configure your book?'
(Use default configuration / Configure with wizard); the wizard offers choices for presets and
Default / Custom for user-specific values such as the chapter path. (5) Everything is
configurable from the project config, existing behaviour stays the default, init stays usable
non-interactively, the generated config contains the selected values, and every page/font
combination paginates validly. (6) Tests and fixtures for every preset, every supported family,
both init flows and the custom branches; sample PDFs visually verified."

## Clarifications

### Session 2026-09-30

- Author request (during specification): code blocks and terminal blocks MUST always use the
  monospace font, whatever body font family is chosen.
- Q: How is a family handled whose licence does not permit redistribution, or cannot be
  confirmed? → A: It is excluded: only families whose licence allows redistribution are offered,
  and the reason for each excluded candidate is recorded in the decision log. There is no
  local-install path.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose the book's page size (Priority: P1)

An author who publishes through a print shop or a platform with a fixed trim size (A5, B5, A4 or
US Letter) sets the page size in the book's config and gets a PDF of exactly that size, laid out
as carefully as the current 170 × 240 mm book.

**Why this priority**: The trim size is fixed by the printer; today only 170 × 240 mm is
possible, which rules out most print services.

**Independent Test**: Build the fixture book once per page size preset and check each PDF's
page size, page count against the default, chapter opening pages, headers, footers, and that no
code block, table or line runs past the text area.

**Acceptance Scenarios**:

1. **Given** a config without a page size, **When** the PDF is built, **Then** it is identical
   to today's 170 × 240 mm PDF, with the same file name.
2. **Given** `page.size` set to `a5`, `b5`, `a4` or `letter`, **When** the PDF is built, **Then**
   every page measures 148 × 210, 176 × 250, 210 × 297 or 216 × 279 mm respectively, and the file
   name says which size it is.
3. **Given** any page size, **When** the screen and the printed PDF are built, **Then** chapters
   still open as configured (including on right-hand pages), headers and footers sit inside the
   page, and wide code, terminal blocks and tables fit the text width or wrap, never overflowing.
4. **Given** a page size that is not one of the five presets (for example `a6` or a width and
   height), **When** any command reads the config, **Then** it stops with one line naming the key
   and listing the allowed values.

---

### User Story 2 - Choose the text size (Priority: P1)

An author sets a smaller text size to reduce the page count, or a larger one for readers who need
larger print, and every element of the PDF — body, headings, code, terminal blocks, tables,
callouts, contents, headers and footers — scales together so the book keeps its proportions.

**Why this priority**: Page count drives print cost, and larger print is an accessibility need;
both are common requests for the same book.

**Independent Test**: Build the fixture book at each font size and compare: `m` is byte-for-byte
the same layout as today; smaller sizes give fewer pages and larger sizes more; the ratios between
body, headings, code and tables stay the same.

**Acceptance Scenarios**:

1. **Given** no font size or `m`, **When** the PDF is built, **Then** the typography and page
   count are exactly today's.
2. **Given** `xs`, `s`, `l` or `xl`, **When** the PDF is built, **Then** body text, headings,
   code, terminal blocks, tables, callouts, contents, headers and footers all change size by the
   same preset factor, and the page count moves in the expected direction.
3. **Given** any size combined with any page size, **When** the PDF is built, **Then** headings
   still keep their following lines with them, code still fits or wraps, and no page is blank or
   overfull.
4. **Given** a size outside the five presets (for example `12pt`), **When** the config is read,
   **Then** the command stops with one line listing the allowed values.

---

### User Story 3 - Choose the Myanmar font family (Priority: P2)

An author picks the Burmese typeface the book is set in from a short list of families that are
known to render Burmese correctly, instead of being limited to Noto.

**Why this priority**: The typeface defines the book's look and reading comfort; authors and
publishers have house fonts, and Padauk and Myanmar Census are widely used in Myanmar.

**Independent Test**: For each supported family, build a Burmese fixture chapter that exercises
stacked consonants, medials, vowel signs, kinzi, Latin runs, bold and italic, code and terminal
blocks, and check shaping, text extraction, embedding and pagination; confirm the licence record.

**Acceptance Scenarios**:

1. **Given** no font family, **When** the book is built, **Then** it uses Noto Sans Myanmar
   exactly as today.
2. **Given** `font.family` set to a supported family, **When** the book is built, **Then** Burmese
   body text and headings are set in that family, embedded in the PDF, shaped correctly, broken
   only at syllable boundaries, and copy out of the PDF as the original text.
3. **Given** any family, **When** a chapter contains code or terminal blocks, **Then** they are
   set in the monospace font, not the chosen family.
4. **Given** a family that has no bold or italic face, **When** the text is bold or italic,
   **Then** the book still renders it legibly in a documented way, and the QA report states
   which styles the family provides.
5. **Given** a candidate family that failed a check or whose licence does not permit
   redistribution, **When** the author looks for it in the documentation or the wizard, **Then**
   it is not offered, and the decision log says why.
6. **Given** a family that is not on the list, **When** the config is read, **Then** the command
   stops with one line listing the supported families.

---

### User Story 4 - Start a book with defaults or a short wizard (Priority: P2)

A new author runs `md2book init` and chooses between a working project with sensible defaults in
one step, or a short wizard that walks through page size, font family, font size and the chapter
folder with ready-made choices, typing only what is truly their own (title, author, a custom
folder).

**Why this priority**: The new options are only useful if authors find them; the wizard makes
them discoverable without making the quick path slower.

**Independent Test**: Drive init in a terminal through both branches, including the Custom
chapter-path branch, and check the files written and every value in the generated config; run
init with flags only, outside a terminal, and check the same.

**Acceptance Scenarios**:

1. **Given** a terminal, **When** the author runs `md2book init`, **Then** the first question is
   "How would you like to configure your book?" with "Use default configuration" selected and
   "Configure with wizard" as the alternative.
2. **Given** "Use default configuration", **When** init finishes, **Then** it asked only for what
   has no default (language, title, author), and the config holds the default page size, font
   family and font size and the default chapter folder.
3. **Given** "Configure with wizard", **When** the author answers each question, **Then** page
   size, font family and font size are picked from lists with the default pre-selected, the
   chapter folder offers "Default (chapters)" and "Custom", and only "Custom" asks for text.
4. **Given** a custom chapter folder, **When** init finishes, **Then** the first chapter is
   created in that folder and the config's chapter pattern points to it.
5. **Given** no terminal (a script or CI), **When** init runs with flags, **Then** it asks
   nothing, applies the flags, uses defaults for the rest, and still stops if language, title or
   author is missing.
6. **Given** any branch, **When** init finishes, **Then** the config contains the chosen page
   size, font family and font size explicitly, and a PDF built from it has those settings.

---

### Edge Cases

- A config written before this feature (no `page`, `font`, but perhaps `font_set: serif`) builds
  exactly as before.
- `font_set` and `font.family` both set and pointing at different typefaces: the command stops
  and names both keys.
- An English book (`language: en`) with a Myanmar font family: the command stops with one line;
  English books keep the Latin families.
- A long unbreakable line of code, a wide table or a long URL at `xl` on `a5`: it wraps or
  scales within the text area; it never overflows the page.
- A chapter heading that no longer fits with its two following lines at a larger size: it moves
  to the next page, as today.
- A cached family file that differs from the verified version: `md2book fonts` replaces it, as
  for today's fonts, so an unverified build is never produced.
- A custom chapter folder that already contains files, or a path outside the book folder: init
  never overwrites a file, and refuses a path that leaves the book folder.
- The EPUB and the web edition: they are reflowable and have their own reader text size, so page
  size and font size do not change them; the font family does, where its licence allows the
  fonts to be embedded or served.

## Requirements *(mandatory)*

### Functional Requirements

#### Page size

- **FR-001**: The config MUST accept `page.size` with exactly the values `default`
  (170 × 240 mm), `a5` (148 × 210 mm), `b5` (176 × 250 mm), `a4` (210 × 297 mm) and `letter`
  (216 × 279 mm); `default` MUST apply when the key is missing. Any other value MUST stop the
  command with one line naming the key and the allowed values.
- **FR-002**: The screen and printed PDF MUST use the chosen page size for every page, with
  margins, running headers, footers and folios placed proportionally for that size.
- **FR-003**: The PDF file name MUST name the page size; the `default` size MUST keep today's
  name (`<output_name>-170x240.pdf` and `-printed.pdf`).
- **FR-004**: The QA report's PDF checks MUST check the page size against the configured preset
  rather than a fixed 170 × 240 mm.

#### Font size

- **FR-005**: The config MUST accept `font.size` with exactly `xs`, `s`, `m`, `l` and `xl`;
  `m` MUST apply when missing and MUST reproduce today's typography exactly. Any other value
  MUST stop the command with one line listing the allowed values.
- **FR-006**: A font size preset MUST scale, by one factor per preset, every typographic size in
  the PDF: body text, chapter titles and numbers, section headings, code and terminal blocks
  (including their reduced sizes for wide lines), inline code, tables, callouts, the title,
  copyright and contents pages, running headers, footers and folios. Line spacing MUST scale
  with it so proportions are kept.
- **FR-007**: The preset factors MUST be ordered (`xs` < `s` < `m` < `l` < `xl`) and fixed; no
  custom size may be expressed.

#### Font family

- **FR-008**: The config MUST accept `font.family` naming one family from a fixed list; the
  default MUST be `noto-sans-myanmar` and MUST reproduce today's output exactly.
- **FR-009**: The candidate families are Noto Sans Myanmar, Myanmar Census, Masterpiece Uni Round,
  NamKhone Unicode and Padauk. A family MUST be listed as officially supported only after it has
  passed every check in FR-010 and the licence review in FR-011; a candidate that fails MUST NOT
  be selectable, and the reason MUST be recorded in the decision log.
- **FR-010**: Support checks for each family, run on a Burmese fixture: correct shaping of
  medials, vowel signs, stacked consonants and kinzi; Latin text; bold and italic (or the
  documented fallback where the family has no such face); syllable-boundary line breaking and
  pagination; embedding in the PDF; text extraction without replacement characters; and the
  QA report's Burmese checks.
- **FR-011**: Each family's licence MUST be confirmed from the font files and the publisher. A
  family MAY be downloaded, cached, embedded in the EPUB and served by the web edition only if its
  licence permits redistribution; its licence file MUST then be kept with it, as for the current
  fonts. A family whose licence does not permit redistribution, or cannot be confirmed, MUST be
  excluded from the supported list (clarified 2026-09-30); there is no local-install path.
- **FR-012**: Code blocks, terminal blocks and inline code MUST always use the monospace font,
  whatever the family (author request).
- **FR-013**: The chosen family MUST apply to every edition that embeds or serves fonts (PDF,
  EPUB, web edition and `cover`), within the limits of FR-011.
- **FR-014**: `md2book fonts` MUST fetch and verify the chosen family (by checksum, as today) and
  the build commands MUST stop, naming the `md2book fonts` command, when it is missing.
- **FR-015**: Existing configs MUST keep working: `font_set` (`sans`, `serif`) MUST keep its
  meaning; a `font.family` that contradicts `font_set` MUST stop the command naming both keys;
  English books MUST keep their Latin families, and a Myanmar family on an English book MUST
  stop the command.

#### init

- **FR-016**: In a terminal, `md2book init` MUST first ask "How would you like to configure your
  book?" with the choices "Use default configuration" (pre-selected) and "Configure with
  wizard".
- **FR-017**: The default branch MUST ask only for values without a default (language, title,
  author) and write a config with the default page size, font family, font size and chapter
  folder.
- **FR-018**: The wizard MUST ask, one at a time: page size, font family (Myanmar books) and
  font size as lists with the default pre-selected and labelled (for example "Default
  (170 × 240 mm)", "Noto Sans Myanmar (default)", "Medium (default)"), and the chapter folder
  as "Default (chapters)" / "Custom", asking for text only after "Custom".
- **FR-019**: The generated config MUST contain the chosen page size, font family and font size
  explicitly, and the chapter pattern MUST point at the chosen folder, where the first chapter is
  created.
- **FR-020**: init MUST remain fully usable without a terminal: every wizard choice MUST also be a
  flag, nothing is asked, defaults fill the rest, and language, title and author stay required.
- **FR-021**: init MUST keep refusing to overwrite files, and MUST refuse a custom chapter folder
  outside the book folder.

#### Everything else

- **FR-022**: The manuscript MUST NOT change; all scaling, fonts and page sizes MUST be applied
  only in generated output.
- **FR-023**: The API MUST mirror the new init options and config keys.
- **FR-024**: The documentation MUST describe the new keys, the presets with their sizes, the
  supported families with their licences and any installation step, and both init flows.

### Key Entities

- **Page size preset**: a name (`default`, `a5`, `b5`, `a4`, `letter`), a width and height in
  millimetres, and a label for the wizard.
- **Font size preset**: a name (`xs` … `xl`), a scale factor applied to all PDF typography, and a
  wizard label ("Extra Small" … "Extra Large").
- **Font family**: an id (for example `noto-sans-myanmar`), a display name, its font files (regular
  and, where they exist, bold), the Latin and monospace companions it is paired with, its licence,
  and its verification record.
- **Book config**: gains `page.size`, `font.family` and `font.size`, alongside the existing keys.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A book built with no new keys, or with `default` / `m` / `noto-sans-myanmar`,
  produces the same PDF layout and page count as before this feature, and the existing
  equivalence checks still pass.
- **SC-002**: All 25 combinations of page size and font size build the fixture book with valid
  pagination: every page is the configured size, no content overflows the text area, chapter
  openings and headings behave as today, and the QA report shows no new problems.
- **SC-003**: Every officially supported family builds the Burmese fixture with 0 replacement
  characters and 0 stray glyph-ID letters in extracted PDF text, all fonts embedded, and passes
  a documented side-by-side visual review of shaping, stacking, Latin, bold/italic, code,
  terminal blocks, tables, callouts, chapter openings, headers and footers.
- **SC-004**: A new author creates a project with the default branch in at most 4 answers, and
  with the full wizard in at most 8, never typing a value that a list could offer.
- **SC-005**: `md2book init` with flags only completes without a terminal and writes the same
  config as the wizard answering the same choices.
- **SC-006**: Every selectable family has a recorded licence that permits redistribution, its
  licence file is kept with the cached fonts, and every excluded candidate has a recorded
  reason.

## Assumptions

- `page` and `font` are JSON objects in `book.json` (`"page": { "size": "a5" }`,
  `"font": { "family": "padauk", "size": "s" }`), matching the author's example.
- The chapter folder is expressed through the existing `chapter_glob` (`<folder>/chapter-*.md`);
  no second key for the same thing is added.
- Page size and font size apply to the PDF only; the EPUB is reflowable and the web edition has
  its own reader text size. `cover` HTML sets its own page size.
- Existing `font_set: serif` (Noto Serif Myanmar) remains available for backward compatibility
  but is not one of the wizard's Myanmar families unless it passes the same checks; English books
  keep Noto Sans and Noto Serif, and the wizard offers those for them.
- Latin text inside Burmese body text uses the family's own Latin glyphs where they pass the
  Latin check, otherwise the existing Noto Latin companion; italics come from the Latin companion
  where the Myanmar family has none.
- Letter is 215.9 × 279.4 mm; it is described as 216 × 279 mm and laid out at its exact size.
- The file-name suffix for a preset is its millimetre size (for example `-148x210`), consistent
  with today's `-170x240`.
- The wizard's non-interactive flags are named after the config keys (for example `--page-size`,
  `--font-family`, `--font-size`, `--chapters`).
