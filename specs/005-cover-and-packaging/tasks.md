---

description: "Task list for Cover Rendering and npm Packaging (delivery slice 6)"
---

# Tasks: Cover Rendering and npm Packaging

**Input**: `specs/005-cover-and-packaging/` (plan, spec, research, data-model, contracts, quickstart)

**Tests**: REQUIRED (Constitution VI): each test task is written and seen failing before its
implementation. Rendering tests are offline and use the print font fixture.

**Public API (Constitution VIII)**: `src/index.ts` gains exactly `cover`.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Create `test/fixtures/cover/cover.html` (`@page { size: 170mm 240mm; margin: 0 }`, a Burmese title in `"Noto Sans Myanmar"`, an English author, a local `mark.png` background image) and `test/fixtures/cover/two-pages.html` (content that spans two pages)

---

## Phase 2: User Story 1 - Render a cover designed in HTML (P1) 🎯 MVP

### Tests ⚠️

- [X] T002 [P] [US1] Write `test/unit/cover/page-size.test.ts`: `pageSizePt(size)` for `170mm 240mm` → [481.89, 680.31]; `8.5in 11in`, `21cm 29.7cm`, `600px 800px`, `A4`, `A5 landscape`, `letter`, a single length (square), `auto`/empty → undefined
- [X] T003 [P] [US1] Write `test/integration/cover.test.ts` (Chromium): `renderCover` on the fixture writes `cover.png` next to the HTML at 2008 × 2835 (300 dpi) and 1004 × 1417 (`--dpi 150`, `-o`); the Burmese title is drawn with the set's font (a render with the fixture font removed differs); `two-pages.html` → `md2book: <html>: expected 1 page, got 2` and no PNG; a remote `<img src="https://…">` → `md2book: cover: unexpected request https://…`; missing fonts → the `md2book fonts` line; two renders are byte-identical; CLI prints `Cover written: <file> (2008 x 2835 px, 300 dpi)`; `--config` and `--set` together → one-line error; `--dpi 0` → one-line error

### Implementation

- [X] T004 [US1] Implement `src/cover/page-size.ts` to pass T002
- [X] T005 [US1] Implement `src/cover/render.ts` `renderCover({ html, output, dpi, set, fontsDir })` per research R-01–R-03 (inject @font-face, serve the folder, count pages with `page.pdf`, size from `@page` else the PDF, screenshot at target ÷ CSS width, sharp resize, write via temp + rename) and `src/cover/command.ts` `runCover`; pass T003
- [X] T006 [US1] Wire `md2book cover <file.html> [-o] [--dpi] [--config|--set]` in `src/cli.ts` (remove the reserved stub); export `cover()` from `src/index.ts`; public-API test adds `cover`; CLI test: no reserved commands remain

---

## Phase 3: User Story 4 - Demo book (P2)

- [X] T007 [US4] Create `examples/demo-book/` from the scratch demo book: `book.json` (common keys incl. `end_image`/`end_image_after`, `recto_chapter_start`, `web_published_chapters`, `strings.licence_text`), `chapters/part-01.md`, `chapter-01.md`, `chapter-02.md`, new `chapter-03.md` completing the format coverage of spec US4 #2 (section levels 2–4, emphasis, list, scene break, `[!TRY]`, a snippet include from `code/`), `code/…` with regions, `cover/cover.html` (Burmese title), `cover/end.png`, and `README.md` explaining each file and the build commands; add `examples/` to `.prettierignore`
- [X] T008 [US4] Render `examples/demo-book/cover/cover.png` with `md2book cover` from its HTML; add `test/integration/demo-book.test.ts`: the demo book loads and renders, every format of US4 #2 appears in the rendered HTML, and its EPUB builds (print fonts)

---

## Phase 4: User Story 2 - Install md2book from npm (P1)

- [X] T009 [P] [US2] Write `test/unit/package-files.test.ts`: `npm pack --dry-run --json` lists exactly the allow-list of data-model.md (no `test/`, `specs/`, `scripts/`, `examples/`, `reference/`, `build/`)
- [X] T010 [US2] Update `package.json`: version `0.1.0`, keywords, `publishConfig: { access: "public", provenance: true }`, scripts `prepublishOnly` (`npm run check && npm run build`) and `package:check`; pass T009
- [X] T011 [US2] Write `scripts/package-check.ts`: build, pack to a temp dir, install the tarball into an empty project, then with the fixture font source: `md2book --help` lists every command, `md2book init` succeeds, `md2book build epub` builds a copy of `examples/demo-book`; exits 1 on any failure
- [X] T012 [US2] Update `README.md`: install from npm (`npm install -g @thixpin/md2book` or `npx`), the Chromium step, `md2book cover`, the demo book link, remove "not on npm yet"

---

## Phase 5: User Story 3 - Publish a release (P2)

- [X] T013 [US3] Rewrite `.github/workflows/ci.yml`: trigger on `pull_request` and `push: tags: ["v*"]` only; jobs `check`, `browser` (Chromium + WebKit) run on both; `release` runs only on tags (`if: startsWith(github.ref, 'refs/tags/v')`, needs both; tag = `v` + package version, else fail naming both; `npm run package:check`; `npm publish --provenance --access public` with `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`; `permissions: contents: read, id-token: write`; registry-url set in setup-node)

---

## Phase 5b: Repository health (author requests)

- [X] T016 [P] Add `SECURITY.md`, `CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml` and `.github/ISSUE_TEMPLATE/config.yml` (FR-015); link them from `README.md`
- [X] T017 Add a coverage check (FR-016): `@vitest/coverage-v8` dev dependency, `npm run coverage` (unit + integration), thresholds just below today's measured values in `vitest.config.ts`, run in the CI `check` job

## Phase 6: Polish

- [X] T014 [P] Visual review (SC-002): render `book-01`'s cover with md2book and compare with the reference PNG side by side; pixel size equal (SC-001); record in `docs/decision-log.md`
- [X] T015 Update `docs/decision-log.md` (cover command decisions, CI on pull requests and tags with tag-only publishing, 0.1.0, demo book) and the constitution note if needed; run `npm run check`, `npm run test:e2e`, `npm run package:check`

## Dependencies

Setup → US1 (cover) → US4 (demo book uses `cover`) → US2 (package check builds the demo book) →
US3 (release job runs the package check) → Polish.
