# Implementation Plan: PDF Editions

**Branch**: `004-pdf-editions` (feature directory; no git branch, work is on `master`) |
**Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/004-pdf-editions/spec.md`; reference `development-book/publish/build.py`
(`fit_pre_blocks`, `add_syllable_breaks`, `build_pdf`), `css/print.css`, `css/printed.css` and
`qa.py` (`pdf_checks`, the report's PDF section) at `d235dbd`; plan-input risks R2–R7.

## Summary

Add `md2book pdf [--printed]`, the PDF section of `md2book qa [--printed]`, and the PDF step of
`md2book all [--printed]`. The build ports `build_pdf`: one print HTML document (cover, front
matter, contents, chapter sections with fitted `pre` sizes and Burmese syllable breaks, optional
end image) styled by the carried `common.css` + `print.css` (+ `printed.css`), laid out by Paged.js
in headless Chromium and printed to PDF, then normalised with `pdf-lib` (exact 170 × 240 mm boxes,
no dates). QA reads the PDF back with `pdfjs-dist` + `pdf-lib` (ActualText-aware text, fonts, size)
and renders sample pages to PNG. The research spike ([research.md](./research.md)) measured every
risk: the 20-chapter book is within −0.6% pages of the reference with identical contents numbers,
extracted Burmese is correct, and the whole PDF takes about 4 s.

## Technical Context

**Language/Version**: TypeScript 6.0 on Node.js 26+ (unchanged).

**Primary Dependencies**: existing (`playwright` for Chromium) +
`pagedjs` `0.4.3` exact (browser bundle only), `pdf-lib` ^1.17 (MIT: PDF normalisation, content
streams, fonts, boxes), `pdfjs-dist` ^6.3 (Apache-2.0: text items, page rendering),
`@napi-rs/canvas` ^1.0 (MIT: canvas for `pdfjs-dist` renders; already its optional dependency).

**Storage**: files: `<out>/<output_name>-170x240[-printed].pdf`, `<out>/src/book-print.html` or
`<out>/src/book-printed.html`, `<out>/qa-pages/*.png`, `<out>/QA-REPORT.md`.

**Testing**: Vitest unit + integration (offline; Chromium via Playwright as in the web slice);
`pdftotext` used as an extraction oracle only when on PATH (skipped with a note otherwise);
equivalence script against the Python toolchain for SC-001 (maintainer, needs `DEVBOOK`).

**Target Platform**: macOS/Linux; PDFs for screen reading and offset printing.

**Performance Goals**: PDF + EPUB + QA of 20 chapters < 2 minutes on CI (SC-005); measured PDF
alone about 4 s for 163 pages.

**Constraints**: no network (`page.route` serves every request; unknown paths fail the build);
sources read-only; byte-identical rebuilds with no dates (Constitution VII, FR-016); the configured
font set only (FR-007).

**Scale/Scope**: one book per run; one PDF edition per run.

No NEEDS CLARIFICATION items remain.

## Constitution Check

| Principle | Gate | Status |
|---|---|---|
| I. Equivalence | Carried `print.css`/`printed.css`; ported `fit_pre_blocks`, `add_syllable_breaks`, page order and QA formulas; SC-001 equivalence script (page size, page count ±2% / ±1 page, N of N chapter openings). Deviations recorded in `docs/decision-log.md`: Paged.js workarounds, code line height 1.7, terminal-dot icons, logical-order extraction line, font names, closed split-block border, no em dash line. | Pass |
| II. Read-only manuscript | Breaks and sizes exist only in `src/book-print*.html`; tests hash sources before/after. | Pass |
| III. Complex scripts | Syllable breaks measured and kept; Burmese fixture checked for 0 U+FFFD, logical-order text, chapter-start detection; samples reviewed (SC-006). | Pass |
| IV. Fail loudly | Missing fonts/cover/Chromium, unknown served path, Paged.js timeout or non-Flate content stream stop with one line; no partial PDF left (write to temp, then rename). | Pass |
| V. Drafts | PDF uses `chapter_glob` like EPUB/QA (reference); web allow-list not involved. | N/A |
| VI. Test-first | Tests precede each module; offline; `pdftotext` optional oracle. | Pass |
| VII. Deterministic | `pdf-lib` pass removes dates and fixes boxes; spike showed byte-identical rebuilds; `src/` and `qa-pages/` rebuilt. | Pass |
| VIII. Small surface | Adds `pdf()`; `qa()`/`all()` gain `printed`; no new config keys. | Pass |
| IX. Web | Not affected. | N/A |

**Post-design re-check**: unchanged; the Paged.js workarounds are CSS and one handler, no
framework.

## Project Structure

### Documentation (this feature)

```text
specs/004-pdf-editions/
├── plan.md, research.md, data-model.md, quickstart.md
└── contracts/
    ├── cli.md          # pdf, qa --printed, all --printed
    ├── pdf-output.md   # print document, stylesheets, page rules, normalisation
    └── qa-pdf.md       # PDF section lines and sample names
```

### Source Code (repository root)

```text
assets/
├── css/print.css         # carried from publish/css/print.css + md2book additions (pre line height)
├── css/printed.css       # carried from publish/css/printed.css + terminal-dot icons
├── css/paged.css         # Paged.js workarounds (research R-01)
└── paged-handler.js      # chapter-first page class
src/
├── pdf/
│   ├── document.ts       # fitPreBlocks, addSyllableBreaks, printDocument (HTML string)
│   ├── stylesheets.ts    # printStylesheets(set, config, printed): carried CSS + generated rules
│   ├── render.ts         # renderPdf(html, assets): Chromium + Paged.js via page.route → PDF bytes
│   ├── normalise.ts      # normalisePdf(bytes): boxes, metadata, deterministic save
│   ├── build.ts          # buildPdf(book, {out, printed, …}): src/ HTML, render, normalise, write
│   └── command.ts        # runPdf
├── qa/
│   ├── pdf-read.ts       # pdfFacts(file): pages, size, fonts, per-page lines (ActualText merge)
│   ├── pdf-checks.ts     # pdfChecks(facts, chapters, printed): chapter starts, short pages, stray
│   ├── pdf-samples.ts    # writeSamples(file, pages, dir): 110 dpi PNGs
│   ├── report.ts         # PDF section (replaces "PDF not built." when the PDF exists)
│   └── command.ts        # runQa/runAll gain `printed`; runAll = pdf → epub → qa
├── cli.ts                # `pdf` wired; `--printed` on pdf/qa/all; reserved: `cover` only
└── index.ts              # + pdf(); qa/all accept printed
test/
├── fixtures/book-mm, book-en   # existing (parts, terminals, tables, callouts, end image, English)
├── unit/pdf/, unit/qa/pdf-*.test.ts
└── integration/pdf.test.ts, pdf-qa.test.ts, pdf-perf.test.ts
scripts/equivalence-pdf.ts       # SC-001 against development-book (book-01 + 20-chapter book)
```

**Structure Decision**: `src/pdf` beside `src/epub` and `src/web`; PDF reading lives in `src/qa`
because only QA reads PDFs. Front matter, contents and chapter heads reuse feature 001/003 modules.

## Complexity Tracking

No violations.
