# Research: Page Size, Font Size and Font Family Presets, and a Guided init

Decisions for [spec.md](spec.md). Code references are to the tree at `ab4bd2c`.

## R-01 Applying the page size without touching the carried stylesheets

- **Decision**: Keep `assets/css/print.css` byte-for-byte (its hash is pinned by
  `test/unit/pdf/stylesheets.test.ts`) and emit page-size overrides in the per-book
  `book.css`, which is already last in the cascade (`src/pdf/stylesheets.ts`). For the
  `default` preset nothing is emitted, so the default PDF is unchanged.
- The overrides for a preset of W × H mm, with `sx = W / 170` and `sy = H / 240`:
  - `@page { size: W H; margin: 20·sy 18·sx 22·sy 18·sx }`, `@page :left` / `:right` inside and
    outside margins `24·sx` / `18·sx` (so the text block keeps the 128 : 170 ratio);
  - `.cover-page` and `.cover-page img` width W and height H;
  - the fixed vertical offsets of the front matter and chapter openings scaled by `sy`:
    `.title-page` padding-top 60 mm, `.title-page .book-subtitle` bottom margin 20 mm,
    `.title-page .book-publisher` top margin 50 mm, `.copyright-page` padding-top 120 mm,
    `.chapter-head` padding-top 34 mm, `.end-page` padding-top 80 mm,
    `.end-image-page img` max-height 165 mm.
- `src/pdf/normalise.ts` sets the MediaBox and CropBox to the preset's exact size instead of the
  fixed 170 × 240 mm (Chromium rounds page sizes; research 004 R-05).
- `pdfName` in `src/pdf/build.ts` uses the preset's millimetre size (`-148x210`, `-216x279`);
  `default` keeps `-170x240`.
- The QA PDF check compares the page size with the preset (FR-004) instead of 170 × 240.
- **Rationale**: Proportional margins keep the same look on every trim size; scaling only the
  fixed vertical offsets keeps the front matter on one page on A5 (the 120 mm copyright offset
  alone would push the notice off a 210 mm page).
- **Alternatives considered**: Fixed millimetre margins on every size (A4 would get a very wide
  text block with 18 mm margins; A5 would lose a quarter of its width to margins). Separate
  carried stylesheets per size (duplicates 240 lines five times and breaks the byte-for-byte
  carry).

## R-02 Scaling the typography by preset

- **Decision**: One factor per preset, applied to every absolute size in the PDF:

  | Preset | Factor | Wizard label           |
  | ------ | ------ | ---------------------- |
  | `xs`   | 0.85   | Extra Small            |
  | `s`    | 0.92   | Small                  |
  | `m`    | 1      | Medium (default)       |
  | `l`    | 1.1    | Large                  |
  | `xl`   | 1.2    | Extra Large            |

  These are the web reader's text-size steps around 1 (`assets/web-reader.js`
  `TEXT_SCALES`), so the two editions scale alike.
- Mechanism: `book.css` re-declares, for `m` ≠ 1, every `font-size: <n>pt` found in the carried
  PDF stylesheets (`common.css`, `print.css`, `printed.css`), including those inside `@page`
  margin boxes, with `n × factor`. The list is derived by scanning the carried CSS at build time,
  not hand-copied, so a new carried size cannot be missed; a unit test asserts that every `pt`
  font size in those files has an override. `em`/`rem` sizes and unitless line heights follow the
  root size automatically. The running-head and folio size set in `book.css` itself (9 pt) is
  multiplied directly.
- Code and terminal blocks: `fitPreBlocks` (`src/pdf/document.ts`) gets the text width and the
  factor: `PRE_USABLE_MM` becomes the preset's text-block width minus 5 mm (123 mm today), and
  `PRE_MAX_PT` (8.3) and `PRE_MIN_PT` (6.0) are multiplied by the factor. With `default` and `m`
  the values are exactly today's.
- **Rationale**: Scaling from the carried CSS keeps `m` identical by construction and keeps the
  proportions between body, headings, code and tables at every size.
- **Alternatives considered**: CSS `zoom` or a transform on the page body (Paged.js measures
  unscaled boxes, which breaks pagination). Changing only the root font size (misses the many
  absolute `pt` sizes in `print.css`: titles, contents, headers, folios).

## R-03 Pagination across all combinations

- **Decision**: The existing pagination rules (headings keep two lines, chapters open on a new
  or right-hand page, tables kept together when short, `pre-wrap` as the overflow safety net)
  are size-independent. An integration test builds the headings fixture for all 25
  page × font combinations and asserts page size, that headings keep their lines (the existing
  `pdf-headings` check), and that no text box extends past the page's text area (from the PDF's
  text positions, as `src/qa/pdf-read.ts` already reads them).
- **Rationale**: One matrix test covers SC-002 without 25 separate fixtures.

## R-04 The init prompts

- **Decision**: A small arrow-key single-choice prompt built on `node:readline`
  (`emitKeypressEvents`, raw mode when the input is a TTY): the first choice is pre-selected and
  marked `❯`, ↑/↓ move, Enter selects, and a digit key selects directly. Text input (title,
  author, custom chapter folder) keeps `readline.question`. Tests drive the prompt through a
  stream with keypress sequences, with no real terminal.
- Order: mode ("Use default configuration" / "Configure with wizard"), language (list: Myanmar,
  English), title, author; then, in the wizard only: page size, font family (the families for the
  chosen language), font size, chapter folder ("Default (chapters)" / "Custom" → text).
  The default branch asks 4 questions and the wizard 8 (SC-004).
- Every choice is also a flag: `--page-size`, `--font-family`, `--font-size`, `--chapters`, plus
  the existing `--lang`, `--font`, `--title`, `--author`. Flags given are not asked. Outside a
  terminal nothing is asked (as today).
- **Rationale**: No new runtime dependency (Principle VIII); the prompt is ~80 lines and fully
  testable.
- **Alternatives considered**: `@inquirer/prompts` (well made, but adds a dependency tree to a
  package that ships to authors, and needs its own test harness).

## R-05 Config shape and compatibility

- **Decision**: `book.json` gains `"page": { "size": … }` and `"font": { "family": …, "size": … }`,
  all optional with defaults `default`, the language's default family, and `m`. The chapter
  folder stays in `chapter_glob` (`<folder>/chapter-*.md`).
- `font.family` ids name font sets: `noto-sans-myanmar` (today's `my-sans`),
  `noto-serif-myanmar` (`my-serif`), `noto-sans` (`en-sans`), `noto-serif` (`en-serif`), plus the
  new Myanmar families that pass R-06. `font_set` keeps working and maps to the Noto ids; a
  `font.family` that names a different set than `font_set` stops the command (FR-015). A
  Myanmar family on an English book, or an English family on a Myanmar book, stops the command.
- `init` writes `page.size`, `font.family` and `font.size` explicitly (FR-019) and no longer
  writes `font_set` (the family carries it).
- The JSON Schema contract in `specs/001-core-manuscript-pipeline/contracts/book-config.schema.json`
  is extended; `test/unit/config/schema.test.ts` keeps it and the zod schema in step.

## R-06 Candidate font families: licences and fit

Evidence gathered on 2026-09-30 by downloading each font and reading its `name` and `OS/2`
tables (fontTools 4.66.1), and from the publishers' pages and Debian/Fedora packaging. The rule
(spec clarification 2026-09-30): a family whose licence does not clearly permit redistribution
is excluded.

| Family | Source and version | Licence evidence | fsType | Styles | Latin | Myanmar (U+1000–109F) | Shaping tables | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Noto Sans Myanmar | notofonts/myanmar 2.107 | OFL 1.1 in the file, `OFL.txt` in the release, no Reserved Font Name | 0 | 9 weights, no italic | no (merged from Noto Sans today) | 160/160 | `mym2` | Supported (default, unchanged) |
| Padauk | silnrsi/font-padauk v6.000 (release zip, SHA-512 matches `SHA512SUMS.txt`) | Full OFL 1.1 in the file, `OFL.txt` in the zip, Debian `fonts-sil-padauk` OFL; **Reserved Font Names** "Padauk", "Namkio", "Deemawso", "SIL" | 0 | Regular, Medium, SemiBold, Bold, ExtraBold; no italic | yes | 160/160 | `mym2` | Candidate, shipped **unmodified** (the RFN forbids a modified copy named Padauk) |
| Masterpiece Uni Round | Prahita Opensource Project, SourceForge, Version 1.0 | Full OFL 1.1 text in the file (no RFN in 1.0); the project page lists OFL 1.1 for the fonts; the sister family moved from LGPL to OFL in 2010 | 0 | Regular only | no | 75/160 (Burmese complete except U+1022, U+1028, U+1033–1035; no U+1050–109F) | `mym2` | Candidate: Latin merged from Noto Sans as for today's sets (allowed: no RFN); licence text extracted from the file as `OFL.txt` |
| Myanmar Census | MCF beta (0.331/0.531, 2013); no longer distributed by MCF; only third-party copies | Short OFL notice in the file, but "All rights reserved" in the copyright string, no licence file from the publisher, Debian's label unreliable | 8 | Regular | yes | 160/160 (0.531) | old `mymr` only | **Excluded** (unclear licence) |
| NamKhone Unicode | namkhone.com, 1.00 and 2.00 (only via the Web Archive) | 1.00: "Free to modify…" with no redistribution grant; 2.00: OFL text but fsType 4 (Preview & Print), which contradicts the OFL | 4 / 8 | Regular | yes | 160/160 | old `mymr` only | **Excluded** (unclear licence) |

- **Decision**: Padauk and Masterpiece Uni Round are the candidates; they become officially
  supported only after passing the checks of FR-010 (R-07). Myanmar Census and NamKhone Unicode
  are excluded and recorded in the decision log with the reasons above.
- Note for a later feature (not in scope): Pyidaungsu 2.5.3, MCF's official successor to Myanmar
  Census, is published by MCF under the OFL (Regular and Bold, Latin, `mym2`).

## R-07 Building and shipping the new families

- **Decision**: Extend `scripts/build-fonts.py` (maintainer tool) with two sets:
  - `my-padauk`: Padauk v6.000 Regular (400), SemiBold (600) and Bold (700) copied byte-for-byte
    from the verified release zip, with its `OFL.txt`. No italic faces: browsers synthesise the
    oblique, as they already do for Burmese.
  - `my-masterpiece`: Masterpiece Uni Round 1.0 merged with Noto Sans Latin (scale 0.93, the same
    merge as `my-sans`), Regular only, with its OFL text as `OFL.txt`. Bold and italic are
    synthesised by the renderer (the documented fallback of FR-010).
  - Both use the shared Noto Sans Mono (with Myanmar) faces for code (FR-012).
- The manifest schema allows a set to omit `body-semibold`, `body-bold`, `body-italic` and
  `body-bolditalic`; `body-regular`, `mono-regular` and `mono-bold` stay required.
  `substituteFonts` drops the carried `@font-face` rule of an omitted role (instead of leaving it
  pointing at a Noto file), so the renderer synthesises that style. The generated web back cover
  uses `body-bold` when present, else `body-regular`.
- Files are published in a new release `fonts-v2` holding every set's files (the existing files
  are byte-identical, so cached copies stay valid); the manifest's `release` and `base_url` move
  to `fonts-v2`. Uploading the release is a maintainer step done with approval.
- Test fixtures: `scripts/make-font-fixtures.py` adds OFL subsets of Padauk and Masterpiece Uni
  Round (the fixture book's characters only), with their licence files, in
  `test/fixtures/fonts-source/` and `test/fixtures/fonts-print/`.
- **Alternatives considered**: Merging Latin into Padauk and synthesising italics as for Noto
  (forbidden under Padauk's RFN unless renamed, and a renamed Padauk would confuse authors).
  Local-only fonts (rejected in the spec clarification).

## R-08 Verifying a family (FR-010, SC-003)

- **Decision**: A fixture chapter `test/fixtures/book-fonts/` exercises medials, vowel signs,
  stacked consonants (`္`), kinzi, asat, Burmese digits and punctuation, Latin runs, bold and
  italic in both scripts, inline code, a code block and a terminal block with Burmese text, a
  table, each callout, and a long paragraph for line breaking. For each supported family an
  integration test builds the PDF and asserts: every glyph from the family's file is embedded;
  extracted text equals the source text (0 replacement characters, 0 stray glyph-ID letters);
  code and terminal text is set in the mono family; the QA report's Burmese checks pass.
- Visual review: `quickstart.md` builds the fixture for every family, page size and font size
  and renders sample pages to PNG for a side-by-side check (shaping, stacking, Latin, bold and
  italic, code, terminal, tables, callouts, chapter openings, headers and footers). The review
  result is recorded in the decision log before a family is listed as supported.
