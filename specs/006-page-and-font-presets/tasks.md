---

description: "Task list for page size, font size and font family presets and the guided init"
---

# Tasks: Page Size, Font Size and Font Family Presets, and a Guided init

**Input**: `specs/006-page-and-font-presets/` (plan, spec, research, data-model, contracts,
quickstart)

**Tests**: REQUIRED (Constitution VI): each test task is written and seen failing before its
implementation. Tests are offline and use the fixture fonts.

**Public API (Constitution VIII)**: `src/index.ts` exports no new functions; `InitOptions`
gains `pageSize`, `fontFamily`, `fontSize`, `chapters` (FR-023).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Create `src/config/presets.ts` with the tables of data-model.md: `PAGE_SIZES`
  (`default` 170 × 240, `a5` 148 × 210, `b5` 176 × 250, `a4` 210 × 297, `letter`
  215.9 × 279.4 mm, each with its file suffix and wizard label), `FONT_SIZES` (`xs` 0.85,
  `s` 0.92, `m` 1, `l` 1.1, `xl` 1.2, labels "Extra Small" … "Extra Large", "Medium (default)"),
  and `FONT_FAMILIES` (id, set id, language, display name, `wizard` flag) for the four Noto
  sets only; add `test/unit/config/presets.test.ts` asserting the values, the order
  `xs < s < m < l < xl`, and that `m` is exactly 1

---

## Phase 2: Foundational (config keys, blocks every story)

- [X] T002 Write failing tests in `test/unit/config/schema.test.ts` and
  `test/unit/config/load.test.ts`: `page.size` accepts exactly `default|a5|b5|a4|letter` and
  defaults to `default`; `font.size` accepts exactly `xs|s|m|l|xl` and defaults to `m`;
  `font.family` must be a known id of the book's language; `font_set` alone maps to the Noto
  family; `font_set` and `font.family` naming different families → one-line error naming both
  keys; a Myanmar family on `language: en` → one-line error; messages have the form
  `<config>: page.size: must be one of default, a5, b5, a4, letter`; unknown keys inside
  `page`/`font` warn; the JSON Schema contract stays in step
- [X] T003 Implement `page` and `font` in `src/config/schema.ts`, resolution in
  `src/config/load.ts` (loaded config gains `page` preset, `font.family`, `font.setId`,
  `font.size` preset) and extend
  `specs/001-core-manuscript-pipeline/contracts/book-config.schema.json`; pass T002
- [X] T004 Route every font-set lookup through the resolved `font.setId` instead of
  `language` + `font_set` (`src/fonts/command.ts`, `src/cover/command.ts`, and the PDF, EPUB,
  web and QA commands that call `getFontSet`); existing tests stay green

**Checkpoint**: existing books build exactly as before; the new keys are read and validated.

---

## Phase 3: User Story 1 - Choose the book's page size (P1) 🎯 MVP

### Tests ⚠️

- [X] T005 [P] [US1] Write `test/unit/pdf/page-size.test.ts`: `pdfName` gives
  `-170x240`/`-148x210`/`-176x250`/`-210x297`/`-216x279` (and `-printed`); `bookCss` for
  `default` contains no page-size rules (the default CSS is unchanged, compare with a snapshot of
  today's output); for `a5` it sets `@page { size: 148mm 210mm }`, margins scaled by
  `sx`/`sy`, `.cover-page` and its image to 148 × 210 mm, and the vertical offsets of research
  R-01 scaled by `sy`
- [X] T006 [P] [US1] Write tests in `test/unit/pdf/normalise.test.ts` (MediaBox and CropBox set
  to the preset's size in points) and `test/unit/pdf/fit-pre.test.ts` (`fitPreBlocks` with the
  default text width gives exactly today's sizes; with the A5 width, long lines get smaller sizes)
- [X] T007 [P] [US1] Update `test/unit/qa/pdf-checks.test.ts` / `report.test.ts`: the page-size
  line names the configured target (`target 148 x 210`)

### Implementation

- [X] T008 [US1] Implement page-size overrides in `bookCss` (`src/pdf/stylesheets.ts`), the
  preset MediaBox in `src/pdf/normalise.ts`, `pdfName` in `src/pdf/build.ts`, the text width in
  `fitPreBlocks` (`src/pdf/document.ts`), and pass the preset through `src/pdf/command.ts` and
  `src/qa/command.ts`; pass T005–T007
- [X] T009 [US1] Write `test/integration/pdf-presets.test.ts` (Chromium, print fonts): the
  headings fixture at each page size (font size `m`) has every page at the preset's size, the
  expected file name, chapter openings on new (and with `recto_chapter_start`, right-hand)
  pages, headings keeping two lines (reuse the `pdf-headings` check), and no text position
  outside the text area; make it pass

- [X] T009a [US1] (Found by T009 at Letter size) Keep a heading with the block after it when
  Paged.js would break inside that block before its first line: `KeepHeadingsWithContent`
  `onOverflow` handler in `assets/paged-handler.js` moves the break before the heading; the
  default-size `pdf-headings` test is unchanged (a first attempt that wrapped every heading with
  a following code block changed default pagination and was dropped)

**Checkpoint**: every page size builds a valid PDF; `default` is unchanged.

---

## Phase 4: User Story 2 - Choose the text size (P1)

### Tests ⚠️

- [X] T010 [P] [US2] Extend `test/unit/pdf/page-size.test.ts` (or a new
  `test/unit/pdf/font-size.test.ts`): for `m`, `bookCss` adds nothing and the folio size stays
  9 pt; for `l`, every `font-size: <n>pt` in `common.css`, `print.css` and `printed.css`
  (including inside `@page` margin boxes) has an override of `n × 1.1` for the same selector,
  and the folio is 9.9 pt; `fitPreBlocks` maximum and minimum sizes are 8.3 × factor and
  6.0 × factor
- [X] T011 [US2] Extend `test/integration/pdf-presets.test.ts` to the full 5 × 5 matrix (page
  size × font size): the same assertions as T009, and page counts ordered `xs ≤ s ≤ m ≤ l ≤ xl`
  for each page size

### Implementation

- [X] T012 [US2] Implement the font-size overrides in `src/pdf/stylesheets.ts` by scanning the
  carried stylesheets for `pt` font sizes (research R-02) and the factor in `fitPreBlocks`;
  pass T010 and T011

**Checkpoint**: all 25 combinations paginate validly; `m` is unchanged.

---

## Phase 5: User Story 4 - Start a book with defaults or a short wizard (P2)

### Tests ⚠️

- [ ] T013 [P] [US4] Write `test/unit/init/select.test.ts`: the prompt renders the question,
  marks the pre-selected first choice with `❯`, moves with ↑/↓ (escape sequences on the input
  stream), selects with Enter and with a digit, and works without a TTY `setRawMode`
- [ ] T014 [P] [US4] Update `test/integration/init.test.ts`: (a) default branch → config has
  `page.size` `default`, `font.family` `noto-sans-myanmar`, `font.size` `m`, `chapter_glob`
  `chapters/chapter-*.md`, and no `font_set`; asks exactly mode, language, title, author;
  (b) wizard branch choosing A5, Large and Custom `src` → config `a5`/`l`, `chapter_glob`
  `src/chapter-*.md`, `src/chapter-01.md` exists; the Custom branch alone asks for text;
  (c) English book → font family choices are Noto Sans (default) and Noto Serif;
  (d) no TTY with `--lang my --title T --author A --page-size b5 --font-size s --chapters text`
  → nothing asked, config has the values; missing `--title` still fails; (e) bad
  `--page-size`/`--font-size`/`--font-family` → one line listing valid values; `--font serif`
  with `--font-family noto-sans-myanmar` → one line naming both; `--chapters /abs`, `../out` or
  empty → one line naming the flag; existing files are never overwritten
- [ ] T015 [P] [US4] Update `test/unit/cli.test.ts` and the public-API test: `init --help` lists
  `--page-size`, `--font-family`, `--font-size`, `--chapters`; `InitOptions` accepts the same

### Implementation

- [ ] T016 [US4] Implement `src/init/select.ts` (research R-04); pass T013
- [ ] T017 [US4] Implement the mode question and wizard in `src/init/prompts.ts`, flag
  validation in `src/init/options.ts`, config writing in `src/init/templates.ts` (page, font,
  `chapter_glob`, no `font_set`), the chapter folder in `src/init/init.ts`, the new flags in
  `src/cli.ts` and `InitOptions` in `src/index.ts`; pass T014 and T015

**Checkpoint**: init offers defaults or the wizard; automation works with flags only.

---

## Phase 6: User Story 3 - Choose the Myanmar font family (P2)

### Tests ⚠️

- [ ] T018 [P] [US3] Update `test/unit/fonts/manifest.test.ts`: a set may omit
  `body-semibold`, `body-bold`, `body-italic`, `body-bolditalic`; `body-regular`,
  `mono-regular`, `mono-bold` and `licence` stay required; the new set ids `my-padauk` and
  `my-masterpiece` are accepted
- [ ] T019 [P] [US3] Write tests for `substituteFonts` (`test/unit/web/assets.test.ts`): a set
  without italic faces drops the carried italic `@font-face` rules and keeps no reference to a
  Noto file; the generated back cover falls back to `body-regular` when `body-bold` is absent
  (`test/unit/web/back-cover.test.ts`)

### Implementation (code support)

- [ ] T020 [US3] Implement optional roles and the new set ids in `src/fonts/manifest.ts` and
  `src/config/language.ts` (`FontSetId`), dropping omitted roles in `substituteFonts`
  (`src/web/assets.ts`), the back-cover fallback (`src/web/back-cover.ts`), and the QA typeface
  line listing only present styles (`src/qa/report.ts`); pass T018 and T019

### Fonts (maintainer build, fixtures, release)

- [ ] T021 [US3] Extend `scripts/build-fonts.py` per research R-07: `my-padauk` (Padauk v6.000
  Regular/SemiBold/Bold copied unmodified from the release zip, zip checksum verified, `OFL.txt`)
  and `my-masterpiece` (Masterpiece Uni Round 1.0, checksum-pinned, merged with Noto Sans Latin
  at 0.93, Regular only, `OFL.txt` extracted from the font's name table); release `fonts-v2`;
  run it to write `build/fonts/` and `assets/fonts-manifest.json` (existing files byte-identical)
- [ ] T022 [US3] Extend `scripts/make-font-fixtures.py` with OFL subsets of the two new sets for
  `test/fixtures/fonts-source/` and `test/fixtures/fonts-print/` (with licence files and
  fixture manifests)
- [ ] T023 [US3] Create `test/fixtures/book-fonts/` (Myanmar book): one chapter with medials,
  vowel signs, stacked consonants, kinzi, asat, Burmese digits and punctuation, Latin runs, bold
  and italic in both scripts, inline code, a code block and a terminal block with Burmese text,
  a table, each callout, and a long paragraph for line breaking (research R-08)
- [ ] T024 [US3] Write `test/integration/pdf-fonts.test.ts` (Chromium, print fonts): for
  `noto-sans-myanmar`, `padauk` and `masterpiece-uni-round`, the fixture PDF embeds the family's
  font, extracted text equals the source (0 replacement characters, 0 stray glyph-ID letters),
  code and terminal text is in the mono font, and the QA Burmese checks pass; the EPUB embeds the
  set's files with its licence file; make it pass
- [ ] T025 [US3] Maintainer step (needs approval): create the `fonts-v2` GitHub release and upload
  `build/fonts/` (every set's files and licences); confirm `md2book fonts --set my-padauk` and
  `--set my-masterpiece` download and verify
- [ ] T026 [US3] Visual verification (SC-003): build `test/fixtures/book-fonts` with each family
  using the real fonts, at `default`/`m` and `a5`/`xl`; render sample pages to PNG; review
  shaping, stacking, Latin, bold/italic, code, terminal, tables, callouts, chapter openings,
  headers and footers; record the outcome per family in `specs/decision-log.md`; set
  `wizard: true` in `FONT_FAMILIES` only for families that pass, and add Myanmar Census and
  NamKhone Unicode to the decision log as excluded with the reasons of research R-06

**Checkpoint**: supported families build every edition; the wizard lists only verified ones.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Update `docs/configuration.md` (`page`, `font` keys; the example with every key),
  `docs/commands.md` (new init flags, PDF file names), `docs/fonts.md` (families, licences,
  excluded fonts), `docs/getting-started.md` (the two init flows), `docs/editions.md` (page
  size and font size in the PDF)
- [ ] T028 [P] Update `specs/decision-log.md`: presets, file-name suffixes, proportional margins,
  font-size factors, init writes `font.family` instead of `font_set`, new font release
- [ ] T029 Run `npm run check`, `npm run test:e2e`, `npm run equivalence:pdf` (with `DEVBOOK`)
  and `npm run docs:build`; fix anything that fails
- [ ] T030 Build sample PDFs of `examples/demo-book` for a representative set (every page size
  at `m`, `a5` at `xs` and `xl`, `a4` at `xl`, each supported family at `default`/`m`) and
  review them per quickstart.md §2–3

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → then US1 (Phase 3) and US2 (Phase 4) in order (US2 extends US1's
  stylesheet and matrix test); US4 (Phase 5) needs only Phase 2; US3 (Phase 6) needs Phase 2,
  and its wizard listing (T026) updates US4's family list.
- Within each story: tests → implementation → checkpoint.
- T025 (release upload) needs the user's approval; T026 needs T025 (or `MD2BOOK_FONTS_SOURCE`
  pointing at `build/fonts/`).

## Parallel Opportunities

- T005, T006, T007 (different test files); T010 alongside T013–T015; T018, T019; T027, T028.
- US4 (Phase 5) can run in parallel with US1/US2 after Phase 2.

## Implementation Strategy

- **MVP**: Phases 1–3 (page sizes) — shippable alone.
- Then US2 (font sizes), US4 (init), US3 (families), each a separate commit series, each
  keeping `npm run check` green.
