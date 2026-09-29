# Feature Specification: Cover Rendering and npm Packaging

**Feature Branch**: `005-cover-and-packaging` (no git branch created)

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "Cover rendering and npm packaging (delivery slice 6 of
reference/docs/spec.md). (1) US-12: `md2book cover <file.html> [-o out.png] [--dpi 300]
[--config <book.json> | --set <font set>]` renders a one-page HTML/CSS cover to PNG with the book
fonts, so Burmese cover text shapes like the book … Port of development-book/publish/render_cover.py
at d235dbd. API `cover()` mirrors the command; `cover` stops being reserved. (2) npm packaging:
`@thixpin/md2book` ready to publish — package contents, metadata, a first version, `npx playwright
install chromium` documented as the one setup step, a release check that packs the tarball,
installs it into an empty project and runs the CLI offline, and a tag-triggered workflow that
publishes with npm provenance (publishing itself needs the maintainer's token and approval)."

Values from the Python toolchain are cited as **[REF]** (`publish/render_cover.py`).

## Clarifications

### Session 2026-09-29

- Q: When does CI run? → A: The checks and browser tests run on pull requests and on version
  tags; publishing runs only on version tags. Plain branch pushes run nothing (the constitution's
  gate — tests, lint and format before merging — is `npm run check`, run locally before each
  commit, and the pull-request checks).
- Q: What is the first published version? → A: `0.1.0` (early release; the CLI and API may still
  change).
- Q: Should the repository include a demo book authors can copy the syntax and formats from?
  → A: Yes (author request): a complete example book in the repository, not in the package
  (User Story 4).
- Author requests during planning: GitHub community files (security policy, contributing guide,
  issue templates; FR-015) and a coverage check in CI (FR-016).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Render a cover designed in HTML (Priority: P1)

An author designs the book's cover as an HTML page with CSS and turns it into the PNG that the
book config points to, with the book's own fonts, so Burmese text on the cover is shaped exactly
like the book.

**Why this priority**: Every edition starts from the cover image; authors in this series design
covers in HTML, and the command is the last reserved one.

**Independent Test**: Render a fixture cover page (Burmese title, English author, a local image)
and check the PNG's pixel size, that Burmese glyphs come from the book font, and the one-page
rule.

**Acceptance Scenarios**:

1. **Given** `cover/cover.html` whose `@page` rule sets 170 × 240 mm, **When** the author runs
   `md2book cover cover/cover.html`, **Then** `cover/cover.png` is written at 300 dpi
   (2008 × 2835 pixels) and the command prints `Cover written: <file> (2008 x 2835 px, 300 dpi)`
   **[REF]**.
2. **Given** `-o out.png` and `--dpi 150`, **When** the author renders, **Then** `out.png` is
   written at 150 dpi (1004 × 1417 pixels for 170 × 240 mm).
3. **Given** a cover whose content spans two pages (or none), **When** the author renders,
   **Then** the command stops with one line naming the HTML file and the page count, and writes
   nothing **[REF]**.
4. **Given** Burmese text styled with the book's family (for example "Noto Sans Myanmar"),
   **When** the cover is rendered, **Then** the text is drawn with the configured font set's files
   (from `--config`'s font set, or `--set`, or `my-sans`), never with a system copy of that family.
5. **Given** the cover references images or stylesheets next to the HTML, **When** it is
   rendered, **Then** they load; **Given** it references anything on the network, **Then** that
   request is refused and the command stops with one line naming it.
6. **Given** the font set is not cached, **When** the author renders, **Then** the command stops
   with the line that names `md2book fonts`.

---

### User Story 2 - Install md2book from npm (Priority: P1)

A book author installs the tool from the npm registry into any book repository and runs it,
without cloning this repository.

**Why this priority**: The package exists to be reused by any book repository (reference spec §1).

**Independent Test**: Pack the package, install the tarball into an empty folder, and run
`md2book --help`, `md2book init` and a web build of a fixture book from that install, offline.

**Acceptance Scenarios**:

1. **Given** the packed package, **When** its file list is read, **Then** it contains the compiled
   program, the carried assets (stylesheets, reader script, Paged.js handler, font manifest),
   `README.md`, `LICENSE` and `package.json`, and nothing from the tests, specs, scripts, the
   reference pack or the maintainer's font build.
2. **Given** a fresh folder, **When** the packed tarball is installed and `npx md2book --help` is
   run, **Then** it lists every command, including `cover`.
3. **Given** that install, **When** the author runs `md2book init` and (with a cover and cached
   fonts) `md2book build epub`, **Then** both succeed without network access.
4. **Given** the README, **When** a new author follows it, **Then** the only setup steps beyond
   installing are `npx playwright install chromium` (for the PDF, the web images and covers) and
   `md2book fonts`.
5. **Given** the package metadata, **When** it is viewed on the registry, **Then** it shows the
   name `@thixpin/md2book`, the version, the description, the MIT licence, the repository, the
   Node.js requirement (26 or newer), keywords and the `md2book` command.

---

### User Story 3 - Publish a release (Priority: P2)

The maintainer publishes a version by pushing a version tag; the registry shows that the package
was built from this repository's source (provenance).

**Why this priority**: Needed once, after stories 1 and 2; it needs the maintainer's registry
token and approval, so it is prepared, not run, in this slice.

**Independent Test**: Read the release workflow; run its steps up to (not including) the publish
step locally.

**Acceptance Scenarios**:

1. **Given** a pushed tag `v<version>` equal to the package version, **When** CI runs, **Then** it
   installs, runs all checks, the browser tests and the package check, and publishes the package
   publicly with provenance.
2. **Given** a tag that differs from the package version, **When** the workflow runs, **Then** it
   stops before publishing with a message naming both versions.
3. **Given** no registry token is configured, **When** the workflow runs, **Then** it fails at the
   publish step without publishing anything.
4. **Given** a pull request, **When** CI runs, **Then** it runs the checks and browser tests and
   never publishes; **Given** a plain branch push, **Then** no workflow runs.

---

### User Story 4 - Learn the formats from a demo book (Priority: P2)

A new author opens a complete example book in the repository and copies its structure: the
config, chapters, parts, code snippets, callouts, tables, terminals, the cover designed in HTML
and the gated end image.

**Why this priority**: `md2book init` creates a one-chapter starter; authors also need a full,
working reference of every supported format.

**Independent Test**: Build the demo book in every edition from a clean checkout (with cached
fonts) and check that each documented format appears in its output.

**Acceptance Scenarios**:

1. **Given** the repository, **When** an author opens `examples/demo-book/`, **Then** it holds a
   `book.json` using every common key, two or more chapters in one or more parts, a code folder
   used by snippet includes, a cover as HTML and PNG, and an end image with its gate chapter.
2. **Given** the demo chapters, **When** they are read, **Then** between them they show every
   manuscript format: chapter and part headings, section headings (levels 2–4), paragraphs,
   emphasis, inline code, fenced code in two languages, a terminal block, a table, every callout
   type (Note, Warning, Try it yourself), a list, a scene break, a snippet include, and Burmese
   mixed with English.
3. **Given** a short guide in that folder, **When** an author reads it, **Then** each file and
   format is explained with the commands to build every edition.
4. **Given** the package check, **When** it runs, **Then** it builds the demo book's EPUB from the
   installed package, so the example cannot fall out of date.
5. **Given** the published package, **When** its file list is read, **Then** the demo book is not
   in it (it lives in the repository only).

---

### Edge Cases

- A cover without an `@page` size: the default print page of the renderer is used and the pixel
  size reported; the author sees the result in the message.
- A cover with a transparent background: the PNG keeps what the page paints (white where the page
  paints nothing, as in print).
- Non-integer pixel sizes (for example 170 mm at 150 dpi): sizes are rounded to the nearest pixel.
- The HTML file does not exist: one line naming it.
- Chromium not installed: one line naming `npx playwright install chromium`.
- An English cover (`--set en-sans`): the English faces are used.
- Installing the package where the platform has no prebuilt canvas binary: installing still
  works; only the PDF QA sample images need it (documented).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `md2book cover <file.html> [-o <out.png>] [--dpi <n>] [--config <path> | --set <id>]`
  MUST render the page to PNG; defaults: `cover.png` next to the HTML, 300 dpi, the font set of
  `--config`, else `--set`, else `my-sans` **[REF]**.
- **FR-002**: The page size MUST come from the HTML's `@page` rule; the PNG MUST be the page size
  at the requested dpi, rounded to whole pixels.
- **FR-003**: A page count other than one MUST stop the command with `md2book: <html>: expected 1
  page, got <n>` and write nothing **[REF]**.
- **FR-004**: The font set's families MUST resolve to its cached files only; missing fonts stop
  the command with the `md2book fonts` line.
- **FR-005**: Files next to the HTML (and below it) MUST load; any other request MUST stop the
  command with one line naming it (no network access).
- **FR-006**: On success the command MUST print `Cover written: <file> (<w> x <h> px, <dpi> dpi)`.
- **FR-007**: The public API MUST gain exactly `cover()`, mirroring the command; `cover` is no
  longer reserved.
- **FR-008**: The published package MUST contain only the compiled program, the carried assets,
  `README.md`, `LICENSE` and `package.json` (plus files npm always adds).
- **FR-009**: A package check MUST pack the package, install the tarball into an empty folder and
  run `--help`, `init` and `build epub` from that install, offline apart from the dependency
  install, and fail on any unexpected file in the package.
- **FR-010**: The package metadata MUST give name, version, description, keywords, licence,
  repository, homepage, bugs, Node.js ≥ 26, the `md2book` command, typed exports and public
  access.
- **FR-011**: The first published version MUST be `0.1.0`.
- **FR-012**: CI MUST run its checks and browser tests on pull requests and on pushed `v*` tags,
  and nothing on plain branch pushes (author decision). Only on a `v*` tag does it then check that
  the tag equals the package version, run the package check and publish publicly with provenance.
- **FR-013**: The README MUST document installing from npm, the one Chromium setup step, and the
  `cover` command, and link the demo book.
- **FR-015**: The repository MUST have GitHub community files (author request): `SECURITY.md`
  (supported versions, how to report a vulnerability privately, response time),
  `CONTRIBUTING.md` (setup, the Spec Kit workflow, tests-first, `npm run check`, commit messages,
  pull requests) and issue templates for bug reports and feature requests (with the version,
  platform, command, config excerpt and a minimal manuscript for bugs).
- **FR-016**: CI MUST measure test coverage (lines, statements, functions, branches) and fail when
  it falls below the recorded thresholds (author request); `npm run coverage` runs it locally.
- **FR-014**: The repository MUST include `examples/demo-book/` as described in User Story 4; it is
  not part of the published package and its cover PNG is rendered by `md2book cover` from its
  HTML.

### Key Entities *(include if feature involves data)*

- **Cover page**: an HTML file with an `@page` size, local assets and text in the book's families.
- **Package**: the published tarball: compiled program, assets, docs, licence, metadata.
- **Release**: a version tag, the checks it runs and the published package with provenance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A 170 × 240 mm cover renders to exactly 2008 × 2835 pixels at 300 dpi, and to the
  reference toolchain's pixel size for `book-01`'s cover.
- **SC-002**: Rendering `book-01`'s cover with md2book and with the Python toolchain gives images
  that a human side-by-side review finds equivalent (same layout, Burmese shaped the same).
- **SC-003**: The package check passes: the package has no file outside the allowed set, and an
  install from the tarball runs `--help`, `init` and `build epub` successfully.
- **SC-004**: A new author following the README goes from an empty folder to a built EPUB with at
  most four commands after installing Node.js (install, Chromium, init, fonts, then build).
- **SC-005**: A cover renders in under 10 seconds on the CI runner.

## Assumptions

- The package name `@thixpin/md2book` is available to the maintainer on the npm registry; the
  maintainer creates the registry token and adds it to the repository's secrets before tagging.
- Chromium is the same browser the PDF and web builds already use; it is installed once per
  machine and is not bundled in the package.
- The fonts are not in the package; they come from the `fonts-v1` release through `md2book fonts`,
  as today.
- Covers are designed at the series' print size, but any `@page` size works.
- The tag-triggered workflow runs on GitHub Actions, where the repository already runs its CI.
