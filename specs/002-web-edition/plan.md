# Implementation Plan: Web Edition

**Branch**: `002-web-edition` (feature directory; no git branch, work is on `master`) |
**Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-web-edition/spec.md`; technical context from
`reference/docs/plan-input.md` (web rows, D4) and the reference `development-book/publish/web.py`
and `web-reader.js` at `d235dbd`.

## Summary

Add `md2book web` and `md2book serve`. The build reuses the core pipeline (feature 001) to
load only the allow-listed chapters (number-based slugs), renders them, and writes a static site
whose every page carries the same continuous book inside the reference reader DOM. The reader
script (`web-reader.js`), `common.css` and the web CSS are carried over from the reference; the
only changes read page names, folio digits and font families from the page so English books and
other font sets work, with defaults that reproduce the reference exactly. Images: cover facts,
share image and favicons with `sharp`; the generated back cover is rendered by headless Chromium
(Playwright) so Myanmar text is shaped correctly. The reader's behaviour is verified with browser
tests over the reference device matrix.

## Technical Context

**Language/Version**: TypeScript 6.0, Node.js 26+ (unchanged from feature 001). Carried-over
browser script stays plain ES2020 JavaScript (plan-input D4).

**Primary Dependencies**: existing (markdown-it, prismjs, zod, commander, fontkit, entities) plus
`sharp` ^0.35 (raster I/O, compositing, SVG → PNG) and `playwright` ^1.63 (headless Chromium for
the generated back cover and browser tests). `node:http` for `serve`.

**Storage**: files only: the built site under `<out>/web/`.

**Testing**: Vitest 5 unit/integration (offline); browser tests in `test/e2e/` run with Vitest +
the Playwright library against a local server (`npm run test:e2e`, separate CI job after
`npx playwright install --with-deps chromium`).

**Target Platform**: build on macOS/Linux; output runs in current Chromium, Safari and Firefox,
including iOS Safari.

**Project Type**: npm package with CLI; this feature adds two commands.

**Performance Goals**: web build of a 20-chapter book < 30 s on the Linux CI runner (SC-006).

**Constraints**: no network in `web`/`serve`; the build never reads unlisted chapters or writes
sources; hashed names deterministic; root-relative URLs.

**Scale/Scope**: single book per build; 12-device browser matrix.

No NEEDS CLARIFICATION items remain; see [research.md](./research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate for this feature | Status |
|---|---|---|
| I. Equivalence | SC-001 compares the file tree (modulo hashes) and the DOM of `index.html` and `ch01.html` with the Python build of `book-01`; `my-sans` + default strings produce a byte-identical stylesheet and the reference DOM. Deviations (parameterised reader/CSS, English folios, no web end image, Vitest + Playwright library instead of Playwright Test) go into `docs/decision-log.md`. | Pass |
| II. Read-only manuscript | The build reads chapters and writes only under `<out>/web/`; a test hashes fixture sources before/after. | Pass |
| III. Complex scripts | Back cover text is laid out by a real browser engine; the reader and CSS are unchanged for Myanmar; Burmese fixture book in browser tests. | Pass |
| IV. Fail loudly | Allow-list, favicon, back cover, missing fonts and missing browser each stop with one line (spec FR-040). | Pass |
| V. Drafts never leak | Only `web_published_chapters` files are opened; SC-005 greps the whole output for a marker from an unlisted fixture chapter. | Pass |
| VI. Test-first | Tests precede each module. Unit/integration tests are offline; browser tests use a local server; the Chromium download is the allowed Playwright install step. | Pass |
| VII. Deterministic | `web/` is emptied and rebuilt; asset hashes are content-only; no timestamps in the site. | Pass |
| VIII. Small surface | Adds `web()`/`serve()` to the API mirroring the CLI; no theme engine: the parameters are the existing series strings and font set. | Pass (see Complexity Tracking) |
| IX. Accessible web | Semantic HTML text (no canvas), labels, `aria-hidden` decoration, 44 px coarse-pointer targets, reduced motion, works without `localStorage`: all asserted by browser tests. | Pass |

**Post-design re-check**: unchanged; the contracts add two commands and one output-tree contract.

## Project Structure

### Documentation (this feature)

```text
specs/002-web-edition/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cli.md              # md2book web / serve
│   └── web-output.md       # output tree, page shell, reader DOM hooks
└── tasks.md                # /speckit-tasks
```

### Source Code (repository root)

```text
assets/
├── css/common.css          # carried over from publish/css/common.css (unchanged)
├── css/web.css             # carried over from web.py WEB_CSS (unchanged)
└── web-reader.js           # carried over; reads page names/digits from the page (FR-021)
src/
├── manuscript/chapters.ts  # + loadPublishedChapters (allow-list, number slugs)
├── web/
│   ├── build.ts            # buildWeb(): orchestrates the site
│   ├── page.ts             # page shell, social tags, 404
│   ├── reader-dom.ts       # reader DOM, front/back matter, panels
│   ├── icons.ts            # Lucide paths (ISC notice)
│   ├── description.ts      # page description cutter
│   ├── assets.ts           # stylesheet (font-set substitution) + reader script, hashed
│   ├── images.ts           # cover facts, OG image, favicons (sharp)
│   ├── back-cover.ts       # copied or generated (Playwright)
│   ├── serve.ts            # node:http static server
│   └── command.ts          # runWeb / runServe for CLI and API
└── cli.ts, index.ts        # + web, serve
test/
├── fixtures/book-mm/…      # + web_published_chapters, an unlisted draft chapter with a marker
├── unit/web/               # allow-list, description, page, DOM, assets, images, serve
├── integration/web.test.ts # full build: tree, drafts, determinism, errors
└── e2e/                    # reader behaviour + device matrix (Playwright)
```

**Structure Decision**: a `src/web/` module next to the core; carried-over browser assets live in
`assets/` (shipped via `package.json` `files`).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Runtime dependency on Playwright + Chromium for the generated back cover | Myanmar needs real shaping (reordering, stacking); a browser engine does it with the book fonts. The same engine is the planned PDF engine and the reader test driver. Only used when `back_cover` is not configured. | Drawing text with an image library cannot shape Myanmar reliably (plan-input); asking every author for a designed back cover removes a spec'd behaviour. |
| Carried-over 1,100-line plain-JS reader outside the TypeScript build | Its constants and fixes are behaviour (plan-input D4); rewriting risks every regression the reference fixed. | A TypeScript rewrite would need the full device matrix re-validated first. |
