# Implementation Plan: EPUB and QA Report

**Branch**: `003-epub-and-qa` (feature directory; no git branch, work is on `master`) |
**Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/003-epub-and-qa/spec.md`; reference `development-book/publish/build.py`
(`front_matter_html`, `xhtml_doc`, `build_epub`) and `qa.py` at `d235dbd`; plan-input rows for
`zipfile`, `xml.etree` and `fontTools` (QA coverage).

## Summary

Add `md2book build epub`, `md2book qa` and `md2book build all` (epub + qa until the PDF feature).
The EPUB is a port of `build_epub`: XHTML documents from the core pipeline's rendered chapters,
nav + NCX + OPF from fixed templates, the configured font set and the carried `common.css` +
`epub.css`, zipped with `mimetype` first and stored. The QA report is a port of `qa.py` without
the em dash search and without repository-specific prose; its PDF section says `PDF not built.`
until the PDF feature.

## Technical Context

**Language/Version**: TypeScript 6.0 on Node.js 26+ (unchanged).

**Primary Dependencies**: existing + `yazl` ^3.3 (zip writing with per-entry store/deflate, entries
in insertion order), `yauzl` ^3.4 (zip reading for QA), `unicode-name` ^1.2 (Unicode character
names for the coverage list; MIT, no dependencies), `fast-xml-parser` promoted from dev to runtime
(QA well-formedness check). `fontkit` (already runtime) reads cmaps. `epubcheck` optional on `PATH`.

**Storage**: files: `<out>/<output_name>.epub`, `<out>/src/epub/`, `<out>/QA-REPORT.md`.

**Testing**: Vitest (unit + integration, offline); epubcheck-dependent assertions skip with a note
when `epubcheck` is not on `PATH`; CI installs it in the check job.

**Target Platform**: macOS/Linux build; output for EPUB 3 readers.

**Performance Goals**: EPUB + QA for 20 chapters < 60 s on CI, epubcheck excluded (SC-005).

**Constraints**: no network; sources read-only; the only timestamps are `dcterms:modified` and the
report's generation time; rebuilt (not patched) outputs.

**Scale/Scope**: one book per run.

No NEEDS CLARIFICATION items remain; see [research.md](./research.md).

## Constitution Check

| Principle | Gate | Status |
|---|---|---|
| I. Equivalence | SC-001–003 compare document order, nav/NCX, manifest set, chapter text and QA counts with the Python build of `book-01`; `my-sans` stylesheets equal the reference. Deviations (no em dash check; generic report prose; coverage uses the configured set; configurable licence/typeface/contents strings) go to `docs/decision-log.md`. | Pass |
| II. Read-only manuscript | QA reports and never fixes; tests hash sources before/after. | Pass |
| III. Complex scripts | Burmese checks ported one-to-one; Burmese fixture seeded with each issue; epubcheck on the Burmese EPUB. | Pass |
| IV. Fail loudly | Load/snippet/font errors stop with one line; content issues are reported (QA's job), not fatal. | Pass |
| V. Drafts | EPUB and QA use `chapter_glob` (the whole book), not the web allow-list — as the reference. | N/A (web only) |
| VI. Test-first | Tests precede each module; offline; epubcheck is an optional local binary. | Pass |
| VII. Deterministic | `src/epub` rebuilt; zip entries sorted; only the two permitted timestamps. | Pass |
| VIII. Small surface | Adds `epub()`, `qa()`, `all()` mirroring the commands. | Pass |
| IX. Web | Not affected. | N/A |

**Post-design re-check**: unchanged.

## Project Structure

```text
specs/003-epub-and-qa/
├── plan.md, research.md, data-model.md, quickstart.md
└── contracts/
    ├── cli.md            # epub, qa, all
    ├── epub-output.md    # package layout, templates
    └── qa-report.md      # report sections and exact line formats

assets/css/epub.css       # carried over from publish/css/epub.css (unchanged)
src/
├── book/load.ts          # loadBook(config): chapters, parts, snippets, render (shared by epub/qa/all)
├── epub/
│   ├── front-matter.ts   # title and copyright pages
│   ├── documents.ts      # xhtml wrapper, cover/title/copyright/nav/chapter/end documents
│   ├── package.ts        # NCX, OPF, container
│   ├── build.ts          # buildEpub(): src/epub tree + zip
│   └── command.ts        # runEpub
├── qa/
│   ├── stats.ts          # manuscript statistics + chapter order
│   ├── unicode.ts        # Unicode / Burmese checks (cap 200)
│   ├── coverage.ts       # typeface coverage with character names
│   ├── epub-checks.ts    # structure, text equality, epubcheck
│   ├── report.ts         # QA-REPORT.md
│   └── command.ts        # runQa, runAll
└── web/assets.ts         # stylesheet(): gains epub.css variant (shared font substitution)
test/
├── fixtures/book-mm/…    # + end image + gate file; an issues chapter for QA (in a QA-only fixture)
├── unit/epub/, unit/qa/
└── integration/epub.test.ts, qa.test.ts
scripts/equivalence-epub-qa.ts   # SC-001–003 against development-book
```

**Structure Decision**: `src/epub` and `src/qa` beside `src/web`; a small `src/book/load.ts`
removes the load-expand-render sequence duplicated in web and the new commands.

## Complexity Tracking

No violations.
