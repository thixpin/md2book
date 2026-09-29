# Feature Specification: Core Manuscript Pipeline

**Feature Branch**: `001-core-manuscript-pipeline` (no git branch created)

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "reference/docs/spec.md" — scoped to Delivery Slice 1 "Core" (§7): US-1–4 and
US-13 (config, chapters, parts, snippets, Markdown rendering, fonts). Later slices (EPUB, PDF, web
build, web reader, cover CLI/API) are separate features.

**Amendment (2026-09-28)**: "user can choose the font type and language (en or mm) in project
init" — added User Story 6 (project init with language and curated font set choice) and made
language-dependent defaults and font sets explicit.

Exact constants, patterns and error strings of the Python toolchain this replaces are cited below
as **[REF §n]**; the values this slice needs are copied into `data-model.md` → Reference constants
(the full reference, `reference/docs/reference-current-behaviour.md`, is git-ignored).

## Clarifications

### Session 2026-09-28

- Q: How should an English chapter's first heading be written? → A: `# Chapter 3 - Title` (no
  parentheses); Myanmar keeps `# အခန်း (၁) - Title`.
- Q: What should happen when an English book's text contains Burmese characters? → A: Warn and
  continue; the warning names the file and character, and the characters are recorded for the QA
  report.
- Q: What project layout should `md2book init` create? → A: One book per directory:
  `book.json` and `chapters/chapter-01.md` in the target directory; a series runs init once per
  book folder.
- Q: Which copyright licence text should a new book get from `md2book init`? → A: MIT. Init
  writes an MIT licence line into `strings.licence_text`; the built-in default (used when the key
  is absent) stays the series CC BY-NC-ND 4.0 paragraph for equivalence.
- Q: What should `md2book init` set as `output_name`? → A: An ASCII slug of the title
  (lower-case letters, digits and hyphens), falling back to `book` when the title has no Latin
  letters or digits.

## User Scenarios & Testing *(mandatory)*

This slice produces no book files yet. It delivers the shared pipeline every later output uses:
a validated book configuration, the loaded and ordered manuscript, expanded code snippets,
rendered chapter HTML, and the book fonts. It is verified through the rendered HTML and the
loaded manuscript data.

### User Story 1 - Configure a book (Priority: P1)

An author describes the book in one JSON configuration file, so that builds are repeatable and
every path is explicit.

**Why this priority**: Every other step reads the configuration; nothing can run without it.

**Independent Test**: Load fixture configs (valid, missing cover, wrong types, unknown keys,
empty optional fields) and check the resolved values, warnings and errors.

**Acceptance Scenarios**:

1. **Given** a config with title, author, year, language, identifier, output name, cover and
   chapter glob, **When** it is loaded, **Then** loading succeeds and every path resolves
   relative to the config file's directory.
2. **Given** a config whose `cover` is empty or points to a missing file, **When** it is loaded,
   **Then** the run stops with a message naming the config file and the cover path.
3. **Given** a config with a key of the wrong type, **When** it is loaded, **Then** the run stops
   before any other work and names the key.
4. **Given** a config with an unknown key, **When** it is loaded, **Then** a warning names the key
   and loading continues.
5. **Given** `publisher` or `isbn` is empty, **When** the config is loaded, **Then** the field is
   marked as absent so later outputs leave it out.
6. **Given** any metadata value contains `PLACEHOLDER`, **When** the config is loaded, **Then**
   the value is recorded for the QA report.

---

### User Story 2 - Write chapters and parts in Markdown (Priority: P1)

An author writes each chapter as a Markdown file starting with a labelled heading, and optionally
groups chapters into parts, so that the tool can number, order and title chapters.

**Why this priority**: The chapter list is the backbone of every output format.

**Independent Test**: Load fixture books (with and without parts, Burmese and ASCII chapter
numbers, CRLF sources) and compare the loaded chapter list and contents structure to expected
values.

**Acceptance Scenarios**:

1. **Given** files matching the chapter glob, **When** chapters load, **Then** they are ordered by
   file name in code-point order and numbered by position from 1.
2. **Given** a chapter whose first non-empty line is `# အခန်း (၁) - Title` **[REF §2]**, **When**
   it loads, **Then** it has label `အခန်း (၁)`, title `Title`, slug `ch01` (from position), full
   title `အခန်း (၁) - Title`, number 1 (Burmese or ASCII digits accepted) and the list of its `##`
   section headings.
3. **Given** a chapter whose first non-empty line is not a chapter heading, **When** it loads,
   **Then** the run stops, naming the file and the offending line.
4. **Given** an English book (language `en`) and a chapter starting `# Chapter 3 - Title`,
   **When** it loads, **Then** it has label `Chapter 3`, number 3 and slug from its position; the
   label word comes from the language default unless the config overrides it.
5. **Given** no files match the chapter glob, **When** chapters load, **Then** the run stops,
   naming the glob.
6. **Given** a source with CRLF line endings or non-NFC text, **When** it loads, **Then** the
   in-memory text is NFC with LF endings and the source file on disk is byte-for-byte unchanged.
7. **Given** a part file starting with `# Part <Roman> - Title` and containing `chapters: a-b`,
   **When** parts load, **Then** each chapter belongs to the first part whose range covers its
   number.
8. **Given** a part file missing its heading or its `chapters:` line, **When** parts load,
   **Then** the run stops, naming the file.
9. **Given** parts are configured and a chapter number no part covers, **When** parts load,
   **Then** the run stops, naming the chapter file and number.
10. **Given** a part that covers no loaded chapter, **When** the contents list is produced,
   **Then** that part is omitted; parts never add pages or content of their own.

---

### User Story 3 - Include tested code instead of pasting it (Priority: P1)

An author includes code from source files with a marker line, so that the code in the book is the
code that is tested.

**Why this priority**: Technical books depend on it; a missing snippet must never produce a
silently incomplete chapter.

**Independent Test**: Expand fixture chapters that include whole files, named regions, nested
regions and markers inside fences; exercise every error path.

**Acceptance Scenarios**:

1. **Given** a line that is exactly `<!-- include: path -->` or `<!-- include: path#region -->`
   (surrounding whitespace allowed), **When** the chapter is expanded, **Then** the line becomes
   a fenced code block whose language comes from the file extension **[REF §3]**.
2. **Given** an include path, **When** it is resolved, **Then** it is relative to the configured
   code root.
3. **Given** a whole-file include, **When** expanded, **Then** no `#region`/`#endregion` comment
   line (`//` or `#` style) appears in the output.
4. **Given** a region include, **When** expanded, **Then** the content between the named region
   and its matching end is taken; nested region marker lines are dropped and their content kept;
   the result is dedented and trimmed of leading and trailing blank lines.
5. **Given** an include marker inside a fenced code block, **When** expanded, **Then** it is left
   untouched.
6. **Given** a missing file, a missing region or an unclosed region, **When** expanded, **Then**
   the run stops with a message naming the chapter and the `path#region`.
7. **Given** a manuscript with includes, **When** it is expanded, **Then** the list of includes
   (`path` or `path#region`) is available for the QA report count.

---

### User Story 4 - Rich Markdown rendering (Priority: P1)

An author uses code blocks, terminal sessions, tables and callouts, so that technical content reads
well in every format.

**Why this priority**: Every output format (PDF, EPUB, web) consumes this rendered HTML.

**Independent Test**: Render fixture Markdown covering each feature and compare the HTML structure,
class names and extracted plain text to expected output.

**Acceptance Scenarios**:

1. **Given** a fenced block with a known language, **When** rendered, **Then** it is
   syntax-highlighted with token classes from the class vocabulary in **[REF §4]** so that the
   existing stylesheets apply unchanged.
2. **Given** a fenced block with no language or an unknown language, **When** rendered, **Then**
   it stays plain and HTML-escaped.
3. **Given** a fenced `console`, `terminal` or `shell-session` block, **When** rendered, **Then**
   it becomes a terminal window (title bar with three dots, then the session), with `$ `
   prompt/command lines and output lines marked differently.
4. **Given** a code block whose longest visible line exceeds 56 characters, **When** rendered,
   **Then** it is tagged `wide`; over 72 characters, it is tagged `xwide`. Markup is removed and
   entities decoded before measuring.
5. **Given** a GitHub pipe table, **When** rendered, **Then** it becomes a table, and `---:`
   right-aligns its column.
6. **Given** a blockquote whose first line is `[!NOTE]`, `[!WARNING]` or `[!TRY]`, **When**
   rendered, **Then** it becomes a callout titled "Note", "Warning" or "Try it yourself"; any
   other `[!X]` stays a plain blockquote.
7. **Given** two callouts separated only by blank lines, **When** rendered, **Then** they stay two
   separate callouts.
8. **Given** a `---` line, **When** rendered, **Then** it becomes a scene break: an `<hr />`
   element, which the stylesheet draws as `* * *`.
9. **Given** any chapter, **When** rendered, **Then** the HTML is well-formed XHTML, and a plain
   text form (markup replaced by spaces, entities decoded, runs of spaces and tabs collapsed) is
   produced for later QA and EPUB comparison.
10. **Given** a chapter, **When** its head is rendered, **Then** it shows the label and the title
    as in **[REF §4]**.

---

### User Story 5 - Book fonts (Priority: P1)

An author gets the book's font set, chosen from a curated list, that covers the book's language
and Latin in one family, so that mixed-script text is consistent in every format.

**Why this priority**: Every output embeds these fonts; Burmese correctness depends on them
(Constitution III).

**Independent Test**: Run the fonts command for each curated set against a local fixture source,
then check the cache contents, font coverage and the offline and missing-font behaviour.

**Acceptance Scenarios**:

1. **Given** a config naming a font set and no cached fonts for it, **When** the author runs
   `md2book fonts`, **Then** that set's font files and licence file are placed in the fonts
   location and verified.
2. **Given** a Myanmar book with the default `sans` set, **When** fonts are fetched, **Then** the
   set is exactly the seven files from **[REF §7]**.
3. **Given** fonts are already cached, **When** any later run needs them, **Then** it uses them
   with no network access.
4. **Given** a font file of the configured set is missing, **When** a run needs fonts, **Then** it
   stops with a message that gives the `md2book fonts` command.
5. **Given** a config naming a font set that is not on the curated list, or not offered for the
   book's language, **When** it is loaded, **Then** the run stops and lists the valid sets.
6. **Given** every face of a Myanmar set, **When** its coverage is checked, **Then** it covers
   both Myanmar (U+1000) and Latin (`a`); every face of an English set covers Latin (`a`).
7. **Given** the italic faces of a Myanmar set, **When** Burmese text with vowel signs is shown in
   them, **Then** the Myanmar glyphs are slanted and the vowel signs stay attached (visual check).

---

### User Story 6 - Start a new book project (Priority: P1)

An author runs `md2book init` and chooses the book's language (Myanmar or English) and a font
set, so that a new book starts from a working config with the right defaults instead of a
hand-copied file.

**Why this priority**: It is the first command a new author runs; language and font choices set
the defaults every later step depends on.

**Independent Test**: Run init in an empty fixture directory with each language and font set
(interactively and with flags), then load the generated config and its sample chapter with the
pipeline from User Stories 1–4.

**Acceptance Scenarios**:

1. **Given** an empty directory, **When** the author runs `md2book init` in a terminal,
   **Then** it asks for the language (Myanmar or English), the font set (from the curated list
   for that language, default `sans`) and the book title and author, and writes `book.json` and
   `chapters/chapter-01.md`.
2. **Given** flags for every choice (for example `--lang en --font serif`), **When** init runs,
   **Then** it asks nothing and writes the same files, so it works in scripts and CI.
3. **Given** the language is entered as `mm`, `my` or `Myanmar`, **When** init runs, **Then** the
   config records the language as `my`; `en` or `English` records `en`.
4. **Given** language `my`, **When** the config is written, **Then** the series-string defaults
   are the current Burmese ones (`အခန်း`, `မာတိကာ`, Burmese digits in the sample chapter heading);
   **given** `en`, they are English (`Chapter`, `Contents`, ASCII digits).
5. **Given** the generated config and sample chapter, **When** they are loaded, **Then** chapter
   loading and rendering succeed; the only failure is the missing cover, which names the cover
   path the author must supply (Constitution IV).
6. **Given** a directory that already contains the config file or the sample chapter, **When**
   init runs, **Then** it stops, names the existing file and writes nothing.
7. **Given** an unsupported language or font set, **When** init runs with flags, **Then** it
   stops and lists the valid values.
8. **Given** init has finished, **When** it prints its summary, **Then** the summary includes the
   `md2book fonts` command to fetch the chosen set.

---

### Edge Cases

- A chapter file with leading blank lines before the heading: the first non-empty line is used.
- A chapter heading using ASCII digits (`အခန်း (7)`): number 7 is parsed.
- File names whose code-point order differs from locale order: code-point order wins.
- A snippet region name that appears in a nested region: depth counting finds the matching end.
- An include marker with trailing spaces or indentation: still matched.
- An unterminated code fence: later include markers are treated as inside the fence.
- Chapter body with only a heading: the body is empty and the section list is empty.
- A Myanmar-language book whose chapter uses the English label word (or the reverse): the
  heading does not match the configured label word and the run stops, naming the file.
- An English book whose chapter text contains Myanmar characters: the run warns (file and
  character) and continues; the characters are recorded for the QA report (FR-046).
- Init with a Burmese-only title (e.g. `ဒေတာ`): `output_name` becomes `book`; a title such as
  `Data Structures & Algorithms` becomes `data-structures-algorithms`.
- Changing `language` in an existing config after init: the language defaults change for any
  series string the config does not set explicitly; explicit values are kept.
- Changing `font_set` after fonts were fetched: the new set must be fetched before the next run
  that needs fonts; the old set stays in the cache.
- Chapter numbers repeating across files: allowed in this slice (the web allow-list check comes in
  the web build feature).
- A part range overlapping another part: the chapter goes to the first part in file order.

## Requirements *(mandatory)*

### Functional Requirements

**Configuration**

- **FR-001**: The system MUST read the book configuration from a single JSON file whose keys and
  types are as in **[REF §1]**, including keys used only by later features.
- **FR-002**: The system MUST validate the configuration before any other work: wrong types and
  missing required keys stop the run; unknown keys produce a warning.
- **FR-003**: All paths in the configuration MUST resolve relative to the configuration file's
  directory.
- **FR-004**: An empty or missing `cover` MUST stop the run, naming the config file and the path.
- **FR-005**: Empty optional metadata (`publisher`, `isbn`) MUST be treated as absent.
- **FR-006**: Metadata values containing `PLACEHOLDER` MUST be collected for the QA report.
- **FR-007**: Series-specific strings MUST be configuration whose defaults depend on the book's
  language: the chapter label word, the label digits, the contents heading, the web page names
  (Cover, Contents, Back cover), the callout titles, the copyright licence paragraph, the
  typeface line and the storage key prefix (`devbook`). For `my` the defaults are the current
  values (`အခန်း`, Burmese digits, `မာတိကာ`); for `en` they are English (`Chapter`, ASCII
  digits, `Contents`). A value set explicitly in the config always wins. This slice uses the
  label word, label digits and callout titles; the rest are defined here and consumed by later
  features.
- **FR-008**: A `code_root` setting MUST define the base for snippet paths.
- **FR-009**: `language` MUST be one of `my` (Myanmar) or `en` (English); any other value stops
  the run and lists the valid values. The chapter heading pattern MUST use the configured label
  word and accept both Burmese and ASCII digits. The heading shape depends on the language:
  `my` uses `# <label word> (<number>) - <title>` **[REF §2]**; `en` uses
  `# <label word> <number> - <title>` with no parentheses. A heading in the other language's
  shape does not match and stops the run.

**Manuscript**

- **FR-010**: Chapters MUST be loaded, ordered, numbered and titled as in User Story 2 and
  **[REF §2]**.
- **FR-011**: Source text MUST be NFC-normalised with LF line endings in memory only; source files
  MUST NOT be modified (Constitution II).
- **FR-012**: Parts MUST be loaded and assigned as in User Story 2 and **[REF §2]**.
- **FR-013**: The system MUST produce the contents list structure (flat, or nested by part with
  empty parts omitted) as in **[REF §2]**.

**Snippets**

- **FR-020**: Include markers MUST be expanded as in User Story 3 and **[REF §3]**, including the
  extension-to-language map.
- **FR-021**: Snippet errors MUST use the three error kinds in **[REF §3]** (file not found,
  region not found, region not closed) and name the chapter.

**Rendering**

- **FR-030**: Markdown MUST be rendered to well-formed XHTML with fenced code, pipe tables and
  inline HTML comments supported.
- **FR-031**: Code highlighting, terminal blocks, callouts, scene breaks, wide/xwide tagging and
  chapter heads MUST follow User Story 4 and **[REF §4]**, using its token class vocabulary.
- **FR-032**: The system MUST produce a plain-text form of each rendered chapter as in
  **[REF §4]**.

**Fonts**

- **FR-040**: `md2book fonts` MUST make the font files of the configured font set and its
  licence file available in a local cache, verifying each file's integrity. For a Myanmar book
  with the default `sans` set, the files are exactly the seven of **[REF §7]**.
- **FR-041**: After `md2book fonts` has run once, commands in this slice MUST NOT need network
  access.
- **FR-042**: Any run that needs fonts and finds one missing MUST stop and print the
  `md2book fonts` command.
- **FR-043**: The system MUST NOT build or merge fonts at run time; it only obtains prebuilt
  files.
- **FR-044**: A `font_set` config key MUST select one set from a fixed, curated list: `sans` and
  `serif` for each language. Each set provides regular, semibold, bold, italic and bold italic
  text faces plus regular and bold monospace faces. Myanmar sets cover Myanmar and Latin in one
  family; English sets cover Latin. The default is `sans`. A set not on the list, or not offered
  for the book's language, stops the run and lists the valid sets.
- **FR-045**: Authors MUST NOT be able to point the tool at arbitrary font files in this
  version; only curated sets are supported.
- **FR-046**: When a book's font set does not cover a character used in chapter text (for
  example Myanmar text in an English book), the run MUST print a warning naming the file and the
  character and continue, and MUST record each such character with its file for the QA report.

**Errors**

- **FR-050**: Every failure MUST give a non-zero exit and a single-line message naming the file
  (or key, glob or command) and the reason; success exits 0.
- **FR-051**: The system MUST NOT silently skip content: any error condition in this specification stops the run
  (Constitution IV).

**Project init**

- **FR-060**: `md2book init` MUST create a new book project in the current directory or a
  directory given as an argument, one book per directory: `book.json` and
  `chapters/chapter-01.md`. The config's `chapter_glob` is `chapters/chapter-*.md` and its
  `cover` is `cover/cover.png` (not created). A series uses one directory per book.
- **FR-061**: Init MUST ask for the language, font set, title and author when run in a terminal,
  and MUST accept all of them as flags (`--lang`, `--font`, `--title`, `--author`) so it can run
  without prompts; when not in a terminal, a missing required choice stops it.
- **FR-062**: Init MUST accept `my`, `mm` or `Myanmar` for Myanmar and `en` or `English` for
  English (case-insensitive), and MUST write `my` or `en` to the config.
- **FR-063**: The generated config MUST pass validation (FR-002), record `language` and
  `font_set`, generate a unique identifier, set `year` to the current year, and use the
  language defaults of FR-007, except `strings.licence_text`, which init MUST set explicitly to
  `This work is licensed under the MIT License. https://opensource.org/license/mit` (the author
  can edit it); init writes no other `strings` keys. `output_name` MUST be the title as an ASCII slug:
  lower-cased, runs of characters other than `a-z0-9` replaced by one hyphen, leading and
  trailing hyphens removed; if nothing remains, `book`. The sample chapter heading MUST match the
  language's label word and digits.
- **FR-064**: Init MUST NOT overwrite or modify any existing file; if a file it would write
  exists, it stops, names the file and writes nothing.
- **FR-065**: Init MUST NOT use the network; it ends by printing the `md2book fonts` command
  for the chosen set.

### Key Entities *(include if feature involves data)*

- **Book configuration**: title, subtitle, author, publisher, year, ISBN, language, identifier,
  output name, cover and other asset paths, chapter and part globs, code root, layout flags and
  series strings. Paths are resolved against the config file's directory.
- **Chapter**: position, slug, label, title, full title, number, section headings, source path,
  body text, rendered HTML, plain text, included snippets.
- **Part**: label (`Part <Roman>`), title, chapter number range, member chapters.
- **Snippet include**: chapter, source path, optional region, language.
- **Font set**: a curated, named entry (`sans` or `serif`) for one language, holding seven font
  faces (family, weight, italic) plus the licence file, with integrity values.
- **Language profile**: `my` or `en`, with its default series strings, label word and label
  digits.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For `development-book`'s `book-01`, the loaded chapter list (count, order, labels,
  titles, numbers, slugs, section headings) and part assignment are identical to the Python
  toolchain's.
- **SC-002**: For every `book-01` chapter, the rendered plain text equals the Python toolchain's
  plain text, ignoring whitespace differences.
- **SC-003**: For every `book-01` chapter, the counts of terminal blocks, highlighted code blocks,
  `wide` and `xwide` blocks, tables and each callout kind equal the Python toolchain's.
- **SC-004**: 100% of the error conditions in this slice (missing cover, empty glob, bad chapter
  heading, bad part file, chapter not covered by any part, three snippet errors, missing fonts,
  wrong config type, unsupported language or font set, init target file already present) stop
  the run with a one-line message naming the file, key or command, each covered by an automated
  test.
- **SC-005**: Running the full slice on a fixture book leaves every source file byte-identical.
- **SC-006**: Every face of every Myanmar set covers both U+1000 and `a`, and every face of every
  English set covers `a`; after the fonts command has run once, all tests pass with the network
  disabled.
- **SC-007**: Loading and rendering a 20-chapter book takes under 10 seconds on the project's
  Linux CI runner (Ubuntu).
- **SC-008**: For each of the 4 language and font-set combinations, `md2book init` with flags
  produces a project whose sample chapter loads and renders with no error other than the missing
  cover, in under 1 minute from an empty directory to that first run.

## Assumptions

- **Scope**: this feature is Delivery Slice 1. EPUB, PDF, QA report, web build, web reader, cover
  rendering and the build commands' API functions are separate features; this slice exposes
  `md2book init` and `md2book fonts` to authors, through both the CLI and the mirrored
  programmatic API (`init()`, `fonts()`, Constitution VIII), and the rest is exercised through
  tests.
- **Code root**: `code_root` is a config key, relative to the config file; its default is the
  git root containing the config file, or the config file's directory if there is none. This
  replaces the Python tool's fixed repository root.
- **CLI inputs**: build commands take `--config <path>` (required) and `--out <dir>` (default
  `dist/<config basename>/` in the current directory), replacing the Python `--book <name>`.
- **Fonts**: each curated font set is built once outside the tool with the existing Python script and
  published as a versioned, checksummed download; `md2book fonts` fetches them into a user
  cache that can be overridden. Hosting: versioned GitHub release assets with SHA-256 in the
  package's manifest (plan research R-05).
  The Myanmar `sans` set is the current set; the families behind the Myanmar `serif` set and
  the two English sets (expected: Noto Serif Myanmar, Noto Sans, Noto Serif, with Noto Sans Mono
  for code) are confirmed when `scripts/build-fonts.py` is run; the plan extends that script to
  the four sets.
- **Language code**: Myanmar is stored as `my` (its BCP 47 code); `mm` is a country code and is
  accepted only as init input. Only `my` and `en` are supported in this version.
- **Equivalence**: a Myanmar book using the default `sans` set and default strings behaves
  exactly as the Python toolchain (Constitution I); English and serif are additions beyond it.
- **Init output**: init writes no cover image; the author adds one, and the first run names the
  missing cover path. Language-specific QA checks (Burmese checks) are handled in the QA feature.
- **Series strings**: per Constitution VIII, all strings listed in FR-007 become configuration
  with language-based defaults; none stay hard-coded. The two language profiles and two font sets
  per language are a fixed list, not a theme or plugin system.
- **Web chapter loading** (slugs from chapter number via the allow-list) belongs to the web
  build feature, not this slice.
- **Highlighting**: token classes follow the existing short-class vocabulary so the current
  stylesheets carry over; exact token boundaries may differ from the Python tool, which is why
  SC-002/SC-003 compare text and structure rather than markup byte-for-byte. Any such difference
  is recorded in the decision log (Constitution I).
- **Performance**: SC-007 is a slice-level target derived from the 2-minute full-build target in
  `reference/docs/spec.md` NFR-001.
- **Platforms**: macOS and Linux are supported; Windows is best-effort.
- **Dependencies**: `development-book` at commit `d235dbd` is available for the equivalence
  comparisons in SC-001–SC-003; the font download is the only network step.
