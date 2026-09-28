---

description: "Task list for the Web Edition (delivery slices 4 and 5)"
---

# Tasks: Web Edition

**Input**: Design documents from `specs/002-web-edition/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED (Constitution VI): each test task is written and seen failing before the
implementation task that follows it. Unit/integration tests are offline; browser tests use a local
server only.

**Reference**: `development-book/publish/web.py`, `web-reader.js`, `css/common.css` at `d235dbd`
(maintainer copy step T003 only). Values used by tasks are in `data-model.md`.

**Public API (Constitution VIII)**: `src/index.ts` gains exactly `web` and `serve`.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Add dependencies `sharp@^0.35` and `playwright@^1.63` to `package.json`; add scripts `test:e2e` (`vitest run --config vitest.e2e.config.ts`) and `equivalence:web` (`node scripts/equivalence-web.ts`)
- [X] T002 [P] Create `vitest.e2e.config.ts` (includes only `test/e2e/**`, setup `test/setup/no-network.ts`, test timeout 60 s) and exclude `test/e2e/**` from `vitest.config.ts`
- [X] T003 [P] Carry over reference assets byte-for-byte: `publish/css/common.css` → `assets/css/common.css`; `WEB_CSS` (web.py lines 28–332, the string content) → `assets/css/web.css`; `publish/web-reader.js` → `assets/web-reader.js`; `ICON_PATHS` → `src/web/icons.ts` with the Lucide ISC notice; record SHA-256 of each copied original in `docs/decision-log.md`
- [X] T004 [P] Add a CI job to `.github/workflows/ci.yml`: `npm ci`, `npx playwright install --with-deps chromium`, `npm run test:e2e`

---

## Phase 2: Foundational

- [X] T005 [P] Write `test/unit/web/published.test.ts`: `loadPublishedChapters` loads only listed files; slug from chapter number (`ch07` for a lone chapter 7); errors (each one line naming key or entry): missing/empty/non-string list, path or non-`.md` entry, missing file, duplicate entry, duplicate chapter number; an unlisted file is never opened (spy on `readFile`)
- [X] T006 Refactor `src/manuscript/chapters.ts` to share one `parseChapter(sourcePath, index, config)` between `loadChapters` and a new `loadPublishedChapters(config)`; keep all feature 001 tests green; pass T005
- [X] T007 [P] Extend fixtures: `test/fixtures/book-mm/book.json` gets `web_published_chapters: ["chapter-01.md", "chapter-02.md"]`, `description`; `test/fixtures/book-en/book.json` gets `web_published_chapters: ["chapter-01.md", "chapter-02.md"]` plus an unlisted `chapters/chapter-03.md` containing `DRAFT-MARKER-3` (in book-en because book-mm's part covers only chapters 1–2) and `favicon: "cover/favicon.svg"` (add a small square SVG) and `back_cover: "cover/back.png"` (1×1 PNG); keep feature 001 tests green (update expected chapter counts where the new chapter appears)

**Checkpoint**: published-chapter loading ready.

---

## Phase 3: User Story 1 - Publish selected chapters as a web book (P1) 🎯 MVP

**Goal**: `book-build web` writes the full site with the reference reader DOM.

**Independent Test**: build the fixtures and inspect tree, markup, drafts and errors (no browser).

### Tests ⚠️

- [X] T008 [P] [US1] Write `test/unit/web/assets.test.ts`: stylesheet = `common.css + "\n" + web.css`; for `my-sans` identical to that concatenation (so its hash equals the reference); for `en-serif` every `Noto Sans Myanmar` → `Noto Serif`, `Noto Sans Mono` stays, `@font-face` URLs point at the set's body-regular, body-bold and mono-regular files; names `style.<12 hex>.css` and `reader.<12 hex>.js` from content hashes
- [X] T009 [P] [US1] Write `test/unit/web/reader-dom.test.ts`: reader DOM for a two-chapter book matches the structure and every `data-*` hook of `contracts/web-output.md` (parse with a DOM/XML parser, compare the element/attribute skeleton to a checked-in expected skeleton); contents heading from `strings.contents_heading`; `data-folio-digits` / `data-name-*` absent for Myanmar defaults, present for an English book; book key `{prefix}:{out dir name}:{10 hex}` changes when chapter text changes
- [X] T010 [P] [US1] Write `test/unit/web/reader-script.test.ts`: the carried `assets/web-reader.js` differs from the reference only in the three reads of FR-021 (defaults `myanmar`, `Cover`, `Contents`, `Back cover`), checked by a text diff against the recorded reference SHA-256 plus the known edited lines
- [X] T011 [P] [US1] Write `test/integration/web.test.ts`: `buildWeb` on `book-mm` writes exactly the contract tree (cover, generated back cover skipped via a stub — see T021 — fonts of the set + licence); `web/` emptied on rebuild (a stray file disappears); two builds give identical file names and bytes (except generated PNGs); `DRAFT-MARKER-3` appears in no output file (SC-005); fixture sources byte-identical after the build; missing fonts → one-line error with the `book-build fonts` command

### Implementation

- [X] T012 [P] [US1] Implement `src/web/assets.ts` (stylesheet with font-set substitution per research R-02; hashed names; copy set fonts + licence into `fonts/`) to pass T008
- [X] T013 [US1] Edit `assets/web-reader.js` minimally (FR-021): folio digits from `reader.dataset.folioDigits` (ASCII when `ascii`, Myanmar otherwise) and page names from `reader.dataset.nameCover/nameContents/nameBackCover` with the reference defaults; record the change in `docs/decision-log.md`; pass T010
- [X] T014 [US1] Implement `src/web/reader-dom.ts` (front/back sections, chapter sections, controls, panels, icons from `src/web/icons.ts`, book key) porting web.py `reader()` exactly; pass T009
- [X] T015 [US1] Implement `src/web/page.ts` minimal shell (html lang, head with title, stylesheet, header, main, footer, deferred script) — social tags come in US3
- [X] T016 [US1] Implement `src/web/build.ts` `buildWeb(config, { out, backCover })`: load published chapters, parts, snippets, render; empty and recreate `web/`; assets; cover copy; `index.html`, `chapters/chNN.html`, `404.html`; pass T011
- [X] T017 [US1] Wire `book-build web --config [--out]` in `src/cli.ts` (via `src/web/command.ts`) and export `web()` from `src/index.ts`; update `test/unit/public-api.test.ts` to exactly `fonts`, `init`, `serve`, `web` (serve added in US4)

**Checkpoint**: site builds; reader opens in a browser.

---

> **Order note (implementation)**: the reader DOM needs cover facts and a back cover, so the cover-facts
> part of T024 (`test/unit/web/cover-facts.test.ts`) and all of T025/T029 (back cover) were done in
> US1, test-first; `test/unit/web/back-cover-no-browser.test.ts` covers the missing-Chromium case.

## Phase 4: User Story 2 - Read it like a book (P1)

**Goal**: the carried reader behaves as the reference on the device matrix.

**Independent Test**: browser tests against a locally served fixture build.

### Tests ⚠️

- [ ] T018 [P] [US2] Write `test/e2e/helpers.ts`: build a fixture site into a temp dir (generated back cover allowed), serve it with `src/web/serve.ts` on a random port, launch Chromium with Playwright; device table from REF §10 (12 entries: viewport, `deviceScaleFactor` 2, touch/mouse, Surface Duo fold via viewport segments emulation where available, else skipped with a note)
- [ ] T019 [P] [US2] Write `test/e2e/layout.test.ts` (SC-003): per device — expected one page or spread (measure visible page boxes), spine centred (± 2 px; on the fold for the Duo), controls within the viewport, `scrollWidth <= clientWidth`, and on touch devices every control ≥ 44 px
- [ ] T020 [P] [US2] Write `test/e2e/reader.test.ts` (SC-004): starts closed on cover; → opens (after 820 ms) and turns; ← back; Next/Previous buttons; touch swipe forward and one back swipe on the phone size; position restored after reload; bookmark toggle + Contents list entry; bookmarks/position with `localStorage` throwing still read fine; search finds a word and jumps; address and title follow a chapter without new history entries; `prefers-reduced-motion` turns instantly; English fixture shows ASCII folios; delayed stylesheet and fonts (route delay 1.5 s) still paginate correctly; the page text is found by `window.find`

### Implementation

- [ ] T021 [US2] Fix any failing reader behaviour only by correcting the build output (DOM/CSS/asset paths) — never by changing reader constants or fixes (FR-022); if a reference behaviour cannot be reproduced, stop and record it in `docs/decision-log.md`

**Checkpoint**: reader parity verified on the matrix.

---

## Phase 5: User Story 3 - Share and find the book (P2)

### Tests ⚠️

- [ ] T022 [P] [US3] Write `test/unit/web/description.test.ts` porting REF §11 cases 4–5: cut at a space, ends with `…`, ≤ 156 code points, prefix of the paragraph, never from `<h2>`; markup stripped (`Use <code>a &amp; b</code>.` → `Use a & b.`); fallback without `<p>`
- [ ] T023 [P] [US3] Write `test/unit/web/page.test.ts`: titles (index, chapter, 404); description meta; og:type `book`/`article`; og site_name/title/description/image(+width 1200, height 630, alt `{title} cover`); twitter card; canonical + og:url only with `web_url` (warning without); 404 `noindex`, no canonical, no script; favicon links only with favicon
- [ ] T024 [P] [US3] Write `test/unit/web/images.test.ts` porting REF §11 cases 6–9: cover facts on a two-colour test PNG (ratio 5 decimals, edge average); `og-image.png` IHDR is 1200 × 630; no favicon → nothing written, returns false; non-SVG or missing favicon → error mentioning `svg`; SVG favicon → square 32 px and 180 px PNGs + `favicon.svg`
- [X] T025 [P] [US3] Write `test/unit/web/back-cover.test.ts`: configured back cover copied as `back-cover{ext}`; configured but missing → error naming it; generated (Chromium) → `back-cover.png` of 850 × round(850/ratio) px whose corner pixel equals the edge colour; Chromium missing → one-line error with `npx playwright install chromium` (simulated)

### Implementation

- [ ] T026 [P] [US3] Implement `src/web/description.ts` to pass T022
- [ ] T027 [US3] Complete `src/web/page.ts` social tags and 404 to pass T023
- [ ] T028 [P] [US3] Implement `src/web/images.ts` with `sharp` (cover facts, OG image, favicons) to pass T024
- [X] T029 [US3] Implement `src/web/back-cover.ts` (copy or Playwright render with the set's bold/regular faces) to pass T025; wire into `buildWeb`

---

## Phase 6: User Story 4 - Preview locally (P2)

### Tests ⚠️

- [ ] T030 [P] [US4] Write `test/unit/web/serve.test.ts`: serves `index.html` for `/`, files with content types, `404.html` with status 404 for unknown paths, refuses `/../` escapes, one-line error naming a busy port, `close()` stops the server

### Implementation

- [ ] T031 [US4] Implement `src/web/serve.ts` with `node:http` to pass T030
- [ ] T032 [US4] Wire `book-build serve --config [--out] [--port]` in `src/cli.ts` (build, serve, print URL, stop on SIGINT) and export `serve()` from `src/index.ts`; public API test = exactly `fonts`, `init`, `serve`, `web`

---

## Phase 7: Polish

- [ ] T033 [P] Write `scripts/equivalence-web.ts` (SC-001): build `book-01` with the Python `web.py` in a temporary copy of `development-book/publish` (the checkout untouched) and with ours; compare file trees ignoring hash segments and the element/attribute skeleton of `index.html` and `chapters/ch01.html`; exit 1 on differences
- [ ] T034 [P] Write `test/integration/web-perf.test.ts`: 20-chapter synthetic book builds in < 30 s with a copied back cover (SC-006)
- [ ] T035 Update `README.md` (web and serve commands, Chromium install note, `web_published_chapters`) and `docs/decision-log.md` (all FR-021 edits, no web end image, English folios, Vitest + Playwright library)
- [ ] T036 Run `npm run check`, `npm run test:e2e`, `npm run equivalence:web`, and the quickstart; rebuild the demo book in the scratch folder with `book-build web` and open it

---

## Dependencies & Execution Order

- Setup → Foundational → US1 → (US2, US3, US4 in any order; US2 browser tests need US4's `serve.ts` helper, so build T031 before T018 if running US2 first) → Polish.
- Within each story: tests first and failing, then implementation.

## Parallel Example: User Story 3

```bash
Task: "Write test/unit/web/description.test.ts"
Task: "Write test/unit/web/page.test.ts"
Task: "Write test/unit/web/images.test.ts"
Task: "Write test/unit/web/back-cover.test.ts"
```

## Implementation Strategy

MVP = Setup + Foundational + US1 (a working web book that opens in a browser). Then US4 (serve)
and US2 (reader parity tests), then US3 (sharing polish), then Polish (equivalence and docs).

## Notes

- Commit after each task or small group (single-line Conventional Commits, no AI co-author).
- Never change reader constants or fixes (FR-022); `reference/` is never committed.
