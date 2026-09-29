# Feature Specification: EPUB and QA Report

**Feature Branch**: `003-epub-and-qa` (no git branch created)

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "EPUB + QA (delivery slice 2): `md2book build epub --config <path>
[--out <dir>]` builds a valid reflowable EPUB 3 of all chapters (US-7), and `md2book qa
--config <path>` writes QA-REPORT.md (US-8) with the manuscript section, em dash search,
Unicode/Burmese checks, typeface coverage, EPUB checks, metadata placeholders, known limitations
and manual-notes sections — without the PDF section, which comes with the PDF slice. EPUB part of
US-11 (gated end image as backmatter). Behaviour must match the Python toolchain's build.py
build_epub and qa.py at d235dbd. Uses the core pipeline (feature 001)."

Values from the Python toolchain are cited as **[REF §n]**; the ones this feature needs are copied
into `data-model.md` → Reference constants during planning.

## Clarifications

### Session 2026-09-29

- Q: Which files should the QA report's em dash search cover? → A: None — the em dash check is
  removed from QA (no "Em dash search" section and no em dash line in the EPUB section).
- Q: What happens to the repository-specific sentences and the Noto-Sans-Myanmar-only typeface
  paragraph in the report? → A: Drop the repository-specific sentences and describe the configured
  font set; all counts and checks stay identical to the reference.
- Q: The whitespace-dependent counts ("Character count (incl. spaces)", "Approximate word count")
  differ from the Python report because the rendered HTML's whitespace differs (mainly
  syntax-highlight spans, plus one nested-list newline). How should SC-003 treat them? → A: Record
  them as a known, deliberate difference; every other count, the Unicode issues and coverage must
  match exactly.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build a valid EPUB (Priority: P1)

An author builds a reflowable EPUB 3 of the whole book, so it can be sold and read on e-readers.

**Why this priority**: The EPUB is a primary sales format and the QA report checks it.

**Independent Test**: Build the fixture books, unzip the result, and inspect the document order,
navigation, metadata and zip layout; run epubcheck when installed.

**Acceptance Scenarios**:

1. **Given** a valid config, **When** the author runs `md2book build epub --config book.json`,
   **Then** `<out>/<output_name>.epub` is written and its unpacked tree is kept in
   `<out>/src/epub/`.
2. **Given** the built EPUB, **When** its reading order is listed, **Then** it is: cover (not in
   the linear reading order), title page, copyright page, navigation document, one document per
   chapter (`text/chNN.xhtml`, position-based slugs), and the end image document when enabled.
3. **Given** the navigation document, **When** it is read, **Then** it holds the contents list
   (nested by part when there are parts; heading from `strings.contents_heading`) and hidden
   landmarks: cover, table of contents, and the start of the body at the first chapter.
4. **Given** the book has parts, **When** the EPUB 2 NCX is read, **Then** its depth is 2 and each
   part's entry shares its first chapter's play order; without parts the depth is 1.
5. **Given** the package metadata, **When** it is read, **Then** it has the identifier, title,
   creator, language, date (the year), the publisher only when set, a UTC `dcterms:modified`
   timestamp and the cover-image property; there is no fixed-layout metadata.
6. **Given** the EPUB file, **When** its zip entries are listed, **Then** `mimetype` is the first
   entry and stored uncompressed, and every other entry is deflated.
7. **Given** the configured font set, **When** the EPUB is built, **Then** all its font files and
   both stylesheets (shared and EPUB) are embedded and declared; the stylesheet names the set's
   families.
8. **Given** the title and copyright pages, **When** they are rendered, **Then** they show the
   title, subtitle, author, publisher and ISBN when set, the copyright line, the licence text from
   `strings.licence_text` and the typeface line from `strings.typeface_line` **[REF §6]**.
9. **Given** epubcheck is installed, **When** the fixture books' EPUBs are checked, **Then** it
   reports no errors.

---

### User Story 2 - Review a QA report (Priority: P1)

An author runs `md2book qa` and reads `QA-REPORT.md`, so typography, encoding and build problems
are caught before publishing.

**Why this priority**: Quality gate before every release; required for the equivalence gate.

**Independent Test**: Run QA on fixture books seeded with known issues and compare each report
section with expected content.

**Acceptance Scenarios**:

1. **Given** a config, **When** the author runs `md2book qa --config book.json`, **Then**
   `<out>/QA-REPORT.md` is written with sections in this order: Manuscript, Unicode / Burmese text
   checks, Typeface coverage, PDF, EPUB, Metadata placeholders, Known layout limitations, Content /
   continuity issues **[REF §8]** (the reference's Em dash search section is removed).
2. **Given** the manuscript, **When** the report is written, **Then** the Manuscript section gives
   the chapter count; chapter order OK or MISMATCH (labels equal the expected label for positions
   1..N in the book's digits); the include count; whitespace-token count; character counts with
   and without spaces; the Myanmar character count; and a table of chapters with section counts.
3. **Given** chapter sources with issues, **When** the report is written, **Then** the Unicode
   section lists, per file (with line numbers where the reference gives them): not NFC; counts of
   U+FFFD, zero-width space, no-break space and BOM; control characters; doubled vowel or medial
   signs; doubled `။`/`၊`; spaces before `။`/`၊`; and, outside code fences, double spaces in prose,
   repeated Burmese words of 4+ characters and HTML tags in prose — at most 200 entries, then
   `… N more`.
4. **Given** the configured font set, **When** the report is written, **Then** Typeface coverage
   gives the counts of Myanmar-script and Latin/other characters covered, and lists each character
   covered by neither with code point, Unicode name and count.
5. **Given** the EPUB was built, **When** the report is written, **Then** the EPUB section reports:
   reflowable yes/no; embedded fonts; chapter document count; chapter text identical to the
   rendered manuscript (whitespace ignored) or the mismatching chapters; structural errors (mimetype order and compression, well-formed XHTML, manifest hrefs exist);
   and epubcheck PASS/FAIL with its output, or NOT RUN when epubcheck is not installed.
6. **Given** the EPUB was not built, **When** the report is written, **Then** the EPUB section says
   `EPUB not built.`; the PDF section always says `PDF not built.` in this feature.
7. **Given** a metadata value (title, subtitle, author, publisher, year, ISBN) containing
   `PLACEHOLDER`, **When** the report is written, **Then** it is listed under Metadata
   placeholders.
8. **Given** the report's fixed text, **When** it is written, **Then** it carries a typeface
   description of the configured font set (body and mono family names, which faces are used for
   body, headings and code), the known-limitations bullets and the closing manual-notes section;
   repository-specific sentences of the reference ("supersedes … Public-Instruction.md",
   "author's convention", "CLAUDE.md, outline.md") are not included.
9. **Given** QA runs, **When** it finishes, **Then** no chapter source is modified; problems are
    reported, never fixed (Constitution II).

---

### User Story 3 - Gated end image in the EPUB (Priority: P2)

An author adds a closing illustration that appears only once the final chapter exists.

**Why this priority**: Parity feature; the book is complete without it.

**Independent Test**: Build a fixture with `end_image` and `end_image_after` with and without the
gate file.

**Acceptance Scenarios**:

1. **Given** `end_image` and an existing gate chapter file named by `end_image_after`, **When** the
   EPUB is built, **Then** a backmatter document with the image follows the chapters and the image
   is in the manifest.
2. **Given** the gate file does not exist (or `end_image` is unset), **When** the EPUB is built,
   **Then** the image is not copied, listed or referenced anywhere.
3. **Given** `end_image` is set, **When** a build runs, **Then** the log says whether the end image
   is included or withheld and why.

---

### Edge Cases

- A chapter containing an em dash: not reported (the em dash check is removed) and never changed.
- An English book: chapter-order check uses the English label shape and ASCII digits; Myanmar
  character count is 0; Burmese-specific checks simply find nothing.
- A cover that is JPEG: `images/cover.jpg` with `image/jpeg`.
- `md2book qa` without a built EPUB: QA still runs the manuscript checks and says `EPUB not built.`
- epubcheck present but failing: the report shows FAIL with the output tail (last 4000 characters);
  the QA command itself still succeeds (it reports, it does not gate).
- Fonts not fetched: `epub` stops with the `md2book fonts` command; `qa` reports coverage only
  when fonts are cached, and says so otherwise.
- Parts with no chapters: omitted from nav and NCX.

## Requirements *(mandatory)*

### Functional Requirements

**EPUB**

- **FR-001**: `md2book build epub --config <path> [--out <dir>]` MUST build `<out>/<output_name>.epub`
  from all chapters; `--out` defaults to `dist/<config file name without extension>/`.
- **FR-002**: Document order, navigation, NCX, metadata, manifest and spine MUST follow User Story 1
  and **[REF §7a]**.
- **FR-003**: Chapter documents MUST contain the chapter head and the rendered chapter HTML from the
  core pipeline, as well-formed XHTML.
- **FR-004**: The zip MUST store `mimetype` first and uncompressed and deflate all other entries;
  the unpacked tree MUST be rebuilt (not patched) in `<out>/src/epub/`.
- **FR-005**: The EPUB MUST embed the configured font set and the shared and EPUB stylesheets; for
  `my-sans` the stylesheets MUST equal the reference's, except the terminal border rules
  appended to `epub.css` (FR-008).
- **FR-008**: In reader themes that replace background and text colours (e.g. Apple Books Night
  and Gray), a terminal block MUST stay recognisable as a window: outlined, with a title-bar
  separator and red/yellow/green dots, drawn with borders because those themes keep borders; in
  light themes it looks unchanged and text is never clipped (added 2026-09-29).
- **FR-006**: The only timestamp in the EPUB MUST be `dcterms:modified` (Constitution VII).
- **FR-007**: The end image MUST be included as backmatter only when its gate file exists
  (User Story 3).

**QA report**

- **FR-010**: `md2book qa --config <path> [--out <dir>]` MUST write `<out>/QA-REPORT.md` with the
  sections of User Story 2, using the reference wording for every check and count **[REF §8]**.
- **FR-011**: The report MUST check the EPUB at `<out>/<output_name>.epub` when it exists.
- **FR-012**: The only timestamp in the report MUST be its generation time.
- **FR-013**: `md2book build all --config <path>` MUST run `epub` then `qa` until the PDF feature adds
  the PDF step.
- **FR-014**: QA MUST NOT modify any source file and MUST NOT stop on content issues; it stops only
  on the same load errors as the core pipeline.

**Errors and API**

- **FR-020**: Every error MUST be one line naming the file, key or command (feature 001 FR-050).
- **FR-021**: `epub` and `qa` MUST NOT need network access (epubcheck runs locally when present).
- **FR-022**: The programmatic API MUST gain `epub()` and `qa()` (and `all()`), mirroring the
  commands (Constitution VIII).

### Key Entities *(include if feature involves data)*

- **EPUB document**: id, href, XHTML content, spine position, linear flag, epub:type.
- **Package**: metadata, manifest items (media types, properties), spine, NCX.
- **QA report**: ordered sections of findings; issue entries capped at 200.
- **Coverage result**: counts of Myanmar-script and Latin characters, and uncovered characters with
  counts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For `development-book`'s `book-01`, the EPUB's document order, nav/NCX structure and
  manifest file set are identical to the Python toolchain's, and epubcheck reports 0 errors.
- **SC-002**: For `book-01`, every chapter's EPUB text equals the rendered manuscript (whitespace
  ignored).
- **SC-003**: For `book-01`, the QA report's manuscript counts, Unicode issue list and coverage
  numbers are identical to the Python toolchain's report, except the two whitespace-dependent
  counts (characters incl. spaces, approximate word count), which are a recorded difference.
- **SC-004**: A fixture seeded with one instance of each Unicode issue produces exactly one report
  entry per issue.
- **SC-005**: EPUB + QA for a 20-chapter book complete in under 60 seconds on the Linux CI runner
  (epubcheck excluded).

## Assumptions

- **Scope**: delivery slice 2. The QA report's PDF section says `PDF not built.` until the PDF
  feature; `all` then gains the PDF step.
- **Reference parity**: `common.css` is reused from feature 002; `epub.css` is carried over from
  `development-book/publish/css/epub.css` and, for sets other than `my-sans`, gets the same
  family/file substitution as the web stylesheet.
- **Series strings**: licence text, typeface line and contents heading come from `strings`
  (feature 001 FR-007); defaults reproduce the reference for Myanmar books.
- **epubcheck**: optional; found on `PATH`; never installed by the tool.
- **Coverage**: uses the configured font set's body-regular and mono-regular faces (the reference
  uses the two Myanmar-set files).
