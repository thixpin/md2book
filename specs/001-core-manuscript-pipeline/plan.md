# Implementation Plan: Core Manuscript Pipeline

**Branch**: `001-core-manuscript-pipeline` (feature directory; no git branch created, work is on
`master`) | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-core-manuscript-pipeline/spec.md`; technical
context from `reference/docs/plan-input.md`.

## Summary

Build the shared core of `@thixpin/md2book`: load and validate a book config (with language
profile `my`/`en` and curated `font_set`), load chapters and parts, expand code snippets, render
Markdown to XHTML with the Python toolchain's class vocabulary, fetch and verify prebuilt font
sets, and scaffold new projects with `md2book init`. No book outputs yet; later slices (EPUB,
PDF, QA, web) consume this pipeline. Behaviour is pinned to `development-book/publish/` at
`d235dbd`; every deliberate difference goes into `specs/decision-log.md`.

## Technical Context

**Language/Version**: TypeScript 6.0 (`strict`, ESM), running on Node.js 26+ (constitution
v1.1.0); `engines.node` `>=26` and `.nvmrc` `26`.

**Primary Dependencies**: `markdown-it` 15 (Markdown → XHTML), `prismjs` 1.30 (tokenizer, mapped
to Pygments short classes), `zod` 4 (config schema), `commander` 15 (CLI), `fontkit` 2 (cmap
reads for FR-046), `entities` 8 (HTML entity decoding). Node built-ins for everything else
(`fs/promises` `glob`, `fetch`, `crypto`, `readline/promises`). See [research.md](./research.md).

**Storage**: Files only: the book config, chapter sources (read-only), a user font cache.

**Testing**: Vitest 5 (unit + fixture integration); `fast-xml-parser` validator for XHTML
well-formedness in tests. Playwright is not needed in this slice.

**Target Platform**: macOS and Linux (CI); Windows best-effort.

**Project Type**: npm package with a CLI (`md2book`) and a library core.

**Performance Goals**: load + render a 20-chapter book in < 10 s on the Linux CI runner (SC-007); `init` → first run
in < 1 min (SC-008).

**Constraints**: no network except `md2book fonts`; never write to manuscript files; never
merge fonts at run time; deterministic output for identical input.

**Scale/Scope**: books of ~20 chapters; 2 language profiles × 2 font sets; commands `init` and
`fonts` exposed, all other commands reserved for later slices.

All earlier NEEDS CLARIFICATION items (highlighter, font hosting, cache location, CLI parser,
prompt mechanism, cmap reader, glob/sort) are resolved in [research.md](./research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate for this slice | Status |
|---|---|---|
| I. Behavioural equivalence | SC-001–003 compare chapter data, plain text and structure counts with the Python toolchain on `book-01`. Decision log lives at `specs/decision-log.md`. Initial entries: `--config`/`--out` replace `--book`; `code_root` replaces the fixed repo root; `en` heading shape; Prism tokens instead of Pygments (same class names, token boundaries may differ); console prompt detection limited to `$ `. | Pass |
| II. Manuscript read-only | Loader only reads; SC-005 byte-compares fixture sources before/after. `init` refuses to overwrite (FR-064). | Pass |
| III. Complex scripts | Burmese fixture (`book-mm`) covers heading digits, NFC, stacked consonants in text; Myanmar font sets checked for U+1000 + `a`; `my-sans` is exactly the current 7 files. | Pass |
| IV. Fail loudly | Every error in spec FR-050/SC-004 is a typed error with a one-line message and a test. FR-046 is a deliberate warning (clarified with the user), not a silent skip. | Pass |
| V. Drafts never leak | Web allow-list is out of scope; this slice loads only the configured chapter glob and exposes no public output. | N/A (web slice) |
| VI. Test-first | Tests before implementation per task. Tests run offline: `md2book fonts` takes a source override (`MD2BOOK_FONTS_SOURCE`, local dir) so fixture tests never touch the network. | Pass |
| VII. Deterministic output | Code-point sorting, NFC, no timestamps in rendered HTML. `init` writes the current year and a random identifier by design (it scaffolds, it is not a build output). | Pass |
| VIII. Small surface | One CLI + mirrored API. Language profiles and font sets are a fixed list of four data entries, not a theme or plugin mechanism; no user-supplied fonts (FR-045). Python font build script justified below. | Pass (see Complexity Tracking) |
| IX. Accessible web output | No web output in this slice. | N/A (web slice) |

**Post-design re-check (after Phase 1)**: unchanged; the data model and contracts add no new
extension points, and the config schema contract is the compatibility surface named in the
constitution's Engineering Standards.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-manuscript-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities and validation
├── quickstart.md        # Phase 1 validation guide
├── contracts/
│   ├── book-config.schema.json   # Config file contract (compat surface)
│   ├── cli.md                    # `init` and `fonts` commands
│   └── font-manifest.md          # Font set manifest shape
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── cli.ts               # md2book: init, fonts (others reserved)
├── index.ts             # public API: exports only init() and fonts() (Constitution VIII)
├── errors.ts            # BookError: one-line message, file/key, exit code
├── config/              # zod schema, load, path + code_root resolution, language defaults
├── manuscript/          # chapters, parts, snippets (+ dedent), contents list
├── markdown/            # markdown-it setup, highlight (Prism → Pygments classes),
│                        # console lexer, callouts, wide tagging, plain text
├── fonts/               # manifest, cache location, fetch + SHA-256 verify, coverage
└── init/                # prompts, templates for book.json and sample chapter
assets/
└── fonts-manifest.json  # curated sets: files, SHA-256, CSS family names
scripts/                 # maintainer/development tooling only; never part of the CLI or API
├── build-fonts.py       # builds the four font sets for release; checks SC-006 coverage
├── make-font-fixtures.py  # subsets fonts into test/fixtures/fonts-source/ (run once)
├── dump-python-reference.py  # imports development-book/publish/build.py, writes chapter
│                             # data, plain text and structure counts as JSON
└── equivalence.ts       # runs the dump via $DEVBOOK, runs our pipeline, diffs (SC-001–003)
docs/
└── decision-log.md      # Constitution I decision log
test/
├── fixtures/
│   ├── book-mm/         # Burmese: parts, snippets, callouts, console, CRLF
│   ├── book-en/         # English headings and profile defaults
│   ├── code/            # snippet sources with regions
│   └── fonts-source/    # tiny subset fonts + four-set manifest for offline tests
├── unit/                # config, chapters, parts, snippets, markdown, fonts, init
├── integration/         # pipeline over fixtures; CLI init and fonts
└── release/             # checks on real font assets; `npm run test:release` only
```

**Structure Decision**: single npm package, trimmed from plan-input's layout to what this slice
uses. `pdf/`, `epub/`, `web/`, `qa/`, `images/`, the CSS assets and `web-reader.js` arrive with
their own slices.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Python maintainer scripts in a TypeScript repo: `scripts/build-fonts.py` | Myanmar sets need fontTools merge, UPM scaling and outline oblique with GPOS anchor shifting; no mature Node equivalent exists (plan-input D2, R1). It runs only when publishing a font release, never inside the tool. | Porting to Node would reimplement fontTools internals and risk Burmese mark placement; shelling out at run time (D2 b) would make every user install Python. |
| `scripts/make-font-fixtures.py` (maintainer/dev tooling) | Offline tests need tiny real TrueType files with known cmaps; fontTools subsetting of the existing OFL fonts produces them in a few KB. Run once; outputs committed; never shipped in the package or exposed by the CLI/API. | Hand-crafting TTF bytes in TypeScript is error-prone; committing full fonts bloats the repo. |
| `scripts/dump-python-reference.py` (development tooling) | SC-001–003 compare against the Python toolchain's own data; the reference implementation is Python, so it is called directly via `$DEVBOOK`. Not in CI by default; never shipped or exposed. | Re-deriving Python results in TypeScript would compare our code with itself. |
