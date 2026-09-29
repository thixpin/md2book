---

description: "Task list for EPUB and QA Report (delivery slice 2)"
---

# Tasks: EPUB and QA Report

**Input**: `specs/003-epub-and-qa/` (plan, spec, research, data-model, contracts, quickstart)

**Tests**: REQUIRED (Constitution VI): each test task is written and seen failing before its
implementation. Offline; epubcheck assertions skip (with a note) when `epubcheck` is not on PATH.

**Reference values**: `data-model.md` → Reference constants and `contracts/`.

**Public API (Constitution VIII)**: `src/index.ts` gains exactly `epub`, `qa`, `all`.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Add `yazl@^3.3`, `yauzl@^3.4`, `unicode-name@^1.2` (+ `@types/yazl`, `@types/yauzl` dev) and move `fast-xml-parser` to dependencies in `package.json`; add script `equivalence:epub-qa` (`node scripts/equivalence-epub-qa.ts`)
- [X] T002 [P] Carry over `development-book/publish/css/epub.css` byte-for-byte to `assets/css/epub.css`; record its SHA-256 in `docs/decision-log.md`
- [X] T003 [P] Add `epubcheck` to the CI check job in `.github/workflows/ci.yml` (`sudo apt-get install -y epubcheck`)

---

## Phase 2: Foundational

- [X] T004 [P] Write `test/unit/book/load.test.ts`: `loadBook(config)` returns chapters (position slugs), parts, expanded and rendered (`html`, `plainText` set) for `book-mm`
- [X] T005 Implement `src/book/load.ts` `loadBook` to pass T004
- [X] T006 [P] Write `test/unit/web/stylesheets.test.ts`: `substituteFonts(css, set)` is identity for `my-sans`; for `en-serif` replaces `"Noto Sans Myanmar"` → `"Noto Serif"` and every `NotoSansMyanmar-{Regular,SemiBold,Bold,Italic,BoldItalic}.ttf` → the set's files (web and epub stylesheets); existing web stylesheet tests still pass
- [X] T007 Refactor `src/web/assets.ts`: export `substituteFonts(css, set)` (all five body roles + two mono roles) and `epubStylesheets(set)` returning `{common, epub}`; pass T006
- [X] T008 [P] Extend fixtures: `test/fixtures/book-mm/book.json` gets `end_image: "cover/end.png"` and `end_image_after: "chapter-02.md"` (add a 1×1 `cover/end.png`); create `test/fixtures/book-qa/` (English-free Burmese config, cover, one chapter seeded with exactly one instance of each Unicode issue of `contracts/qa-report.md`, one `PLACEHOLDER` value); keep all earlier tests green

---

## Phase 3: User Story 1 - Build a valid EPUB (P1) 🎯 MVP

### Tests ⚠️

- [X] T009 [P] [US1] Write `test/unit/epub/documents.test.ts`: `xhtmlDoc` equals the template in data-model.md exactly; title and copyright pages (subtitle/publisher/ISBN only when set; licence and typeface lines from `strings`); cover, nav (contents heading from strings, landmarks, first chapter), chapter and end bodies; every document well-formed XML
- [X] T010 [P] [US1] Write `test/unit/epub/package.test.ts`: NCX without parts (depth 1, playOrder 1…N) and with parts (depth 2, part playOrder = first chapter's, empty parts omitted, `nppart{index}` ids); OPF metadata lines, publisher only when set, `dcterms:modified` format, manifest order and media types, fonts sorted, `properties="nav"`, spine with `linear="no"` cover; container.xml exact
- [X] T011 [P] [US1] Write `test/integration/epub.test.ts`: `buildEpub` on `book-mm` writes `<out>/<output_name>.epub` and `<out>/src/epub/`; zip entry 0 is `mimetype`, stored, content `application/epub+zip`; all others deflated, sorted; the set's fonts and both stylesheets present; `src/epub` rebuilt (a stray file disappears); only timestamp is `dcterms:modified`; sources unchanged; epubcheck (when on PATH) exits 0 for `book-mm` and `book-en`; missing fonts → one-line error with the fonts command

### Implementation

- [X] T012 [P] [US1] Implement `src/epub/front-matter.ts` and `src/epub/documents.ts` to pass T009
- [X] T013 [P] [US1] Implement `src/epub/package.ts` (NCX, OPF, container) to pass T010
- [X] T014 [US1] Implement `src/epub/build.ts` `buildEpub(book, {out, fontsDir?, manifestPath?, now?})`: write `src/epub/` tree, zip with yazl (mimetype first stored, rest deflated sorted); pass T011
- [X] T015 [US1] Wire `book-build epub` in `src/cli.ts` via `src/epub/command.ts`; export `epub()` from `src/index.ts`; public-API test adds `epub`

---

## Phase 4: User Story 2 - Review a QA report (P1)

### Tests ⚠️

- [ ] T016 [P] [US2] Write `test/unit/qa/stats.test.ts`: chapter/character/token/Myanmar counts with Python semantics (research R-04) on known strings; chapter order OK/MISMATCH for Myanmar and English labels
- [ ] T017 [P] [US2] Write `test/unit/qa/unicode.test.ts`: on `book-qa` exactly one entry per seeded issue with the exact formats of `contracts/qa-report.md` (line numbers, `pyRepr` quoting); markers inside ``` fences ignored; cap at 200 with `- ... N more`
- [ ] T018 [P] [US2] Write `test/unit/qa/coverage.test.ts`: Myanmar/Latin counts and uncovered list (`U+XXXX NAME xN`, count-descending) with fixture fonts; characters ≤ 32 and whitespace ignored
- [ ] T019 [P] [US2] Write `test/unit/qa/epub-checks.test.ts`: a built fixture EPUB passes (no structural errors, text identical, chapter docs = N, fonts listed, reflowable); tampered copies report mimetype order, compression, broken XHTML, missing manifest href and text mismatch; epubcheck PASS/FAIL/NOT RUN (NOT RUN simulated with an empty PATH)
- [ ] T020 [P] [US2] Write `test/integration/qa.test.ts`: `book-build qa` on `book-qa` writes `QA-REPORT.md` with the sections and order of the contract (no Em dash section), `PDF not built.`, `EPUB not built.` before and EPUB details after `book-build epub`, placeholders listed, generated line the only timestamp; sources unchanged; `book-build all` writes both files

### Implementation

- [ ] T021 [P] [US2] Implement `src/qa/stats.ts` to pass T016
- [ ] T022 [P] [US2] Implement `src/qa/unicode.ts` to pass T017
- [ ] T023 [P] [US2] Implement `src/qa/coverage.ts` (fontkit + unicode-name) to pass T018
- [ ] T024 [P] [US2] Implement `src/qa/epub-checks.ts` (yauzl, XMLValidator, epubcheck on PATH) to pass T019
- [ ] T025 [US2] Implement `src/qa/report.ts` and `src/qa/command.ts` (`runQa`, `runAll`); wire `qa` and `all` in `src/cli.ts`; export `qa()` and `all()`; public-API test = `all, epub, fonts, init, qa, serve, web`; pass T020

---

## Phase 5: User Story 3 - Gated end image (P2)

- [ ] T026 [P] [US3] Write `test/unit/epub/end-image.test.ts`: gate present → `text/end.xhtml` backmatter after the chapters, `images/end.png` in the manifest, log `End image: included`; gate absent or `end_image` unset → nothing copied, listed or referenced, log `End image: withheld (chapter-02.md not in chapters/)`
- [ ] T027 [US3] Implement the gate in `src/epub/build.ts` (and the log line in the epub/all commands) to pass T026

---

## Phase 6: Polish

- [ ] T028 [P] Write `scripts/equivalence-epub-qa.ts` (SC-001–003): build `book-01` with Python `build.py epub` + `qa` in a temp copy and with ours; compare document order, nav/NCX structure, manifest file set, per-chapter text, and the report's manuscript counts, Unicode issue list and coverage numbers
- [ ] T029 [P] Write `test/integration/epub-perf.test.ts`: EPUB + QA of a 20-chapter book < 60 s without epubcheck (SC-005)
- [ ] T030 Update `README.md` (epub, qa, all) and `docs/decision-log.md` (removed em dash check, generic report prose, configured-set coverage, strings in front matter)
- [ ] T031 Run `npm run check`, `npm run test:e2e`, the equivalence script and the quickstart; build the demo book's EPUB and QA report

## Dependencies

Setup → Foundational → US1 → US2 (EPUB checks need a built EPUB) → US3 → Polish.
