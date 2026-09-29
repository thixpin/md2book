---

description: "Task list for the Core Manuscript Pipeline (Delivery Slice 1)"
---

# Tasks: Core Manuscript Pipeline

**Input**: Design documents from `specs/001-core-manuscript-pipeline/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED. Constitution VI (Test-First, NON-NEGOTIABLE): every test task is written and
seen failing before the implementation task that follows it. Tests never use the network
(`MD2BOOK_FONTS_SOURCE` points at a local fixture directory).

**Organization**: Tasks are grouped by user story (US1–US6 = spec User Stories 1–6).

**References**: `[REF §n]` values are copied verbatim into `data-model.md` → Reference constants,
which every task uses; `reference/` is git-ignored background only and no task depends on it.
Python source of truth: `development-book/publish/` at `d235dbd` (maintainer tasks only).

**Public API (Constitution VIII)**: `src/index.ts` exports only `init` and `fonts`, mirroring the
CLI. Internal modules are never re-exported; tests import them from their `src/...` paths.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)

## Path Conventions

Single npm package at the repository root: `src/`, `test/`, `assets/`, `scripts/`, `docs/`
(see plan.md → Project Structure). Root `README.md` and `docs/` are real project documentation.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling

- [X] T001 Create `package.json`: name `@thixpin/md2book`, `"type": "module"`, `"license": "MIT"`, `"engines": { "node": ">=26" }`, `"bin": { "book-build": "dist/bin.js" }` (`src/bin.ts` calls `runCli`; see decision log), `"files": ["dist", "assets"]`; dependencies `markdown-it@^15`, `prismjs@^1.30`, `zod@^4`, `commander@^15`, `fontkit@^2`, `entities@^8`; devDependencies `typescript@~6.0.3`, `vitest@^5`, `eslint`, `typescript-eslint`, `prettier`, `fast-xml-parser@^5`, `@types/markdown-it`, `@types/prismjs`, `@types/node`; scripts `build` (tsc), `typecheck` (tsc --noEmit), `lint`, `format:check`, `test` (vitest run), `check` (typecheck + lint + format:check + test), `test:release` (vitest run --config vitest.release.config.ts; maintainer only, after T067), `equivalence` (node scripts/equivalence.ts)
- [X] T002 Create `tsconfig.json`: `strict: true`, `module`/`moduleResolution` `nodenext`, `target` `es2024`, `rootDir` `src`, `outDir` `dist`, `declaration: true`
- [X] T003 [P] Create `eslint.config.js` (flat config with `typescript-eslint` recommended-type-checked), `.prettierrc.json`, and `.prettierignore` (`dist`, `reference`, `specs`)
- [X] T004 [P] Create `vitest.config.ts` (excludes `test/release/`) and `vitest.release.config.ts` (includes only `test/release/**`), both with setup file `test/setup/no-network.ts` that wraps `globalThis.fetch` and throws `network access in tests` for any URL whose `hostname` is not `localhost`, `127.0.0.1` or `[::1]` (Constitution VI; local servers only). The guard covers `fetch`, the only HTTP client `src/` uses
- [X] T005 [P] Create `.nvmrc` containing `26` and append `node_modules/` and `dist/` to `.gitignore`
- [X] T006 [P] Create MIT `LICENSE` (copyright holder `thixpin`, year 2026)
- [X] T007 [P] Create `docs/decision-log.md` (Constitution I) with the initial entries from plan.md Constitution Check row I: `--config`/`--out` replace `--book`; `code_root` replaces fixed repo root; `en` heading shape `# Chapter 3 - Title`; Prism tokens with Pygments class names (boundaries may differ); console prompts only `$ `; snippet region names ASCII `[A-Za-z0-9_-]`; `init` writes MIT licence text

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared error type, language profiles, config schema, CLI skeleton, fixtures

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 [P] Write `test/unit/errors.test.ts`: `BookError(subject, reason)` formats `book-build: <subject>: <reason>` on one line; `warn(msg)` writes `warning: <msg>` to stderr. Write `test/unit/cli.test.ts` (passes after T013): `runCli` maps a thrown `BookError` to exit code 1 with the one-line message; each reserved command (`pdf`, `epub`, `qa`, `all`, `web`, `serve`, `cover`) prints `not available yet` and exits 1
- [X] T009 [P] Write `test/unit/config/language.test.ts`: profiles `my` and `en` return the defaults in data-model.md `strings` table (`my`: `chapter_label` `အခန်း`, `chapter_digits` `"myanmar"`, `contents_heading` `မာတိကာ`; `en`: `Chapter`, `"ascii"`, `Contents`; both: page names `Cover`/`Contents`/`Back cover`, callout titles `Note`/`Warning`/`Try it yourself`, `storage_prefix` `devbook`, licence paragraph from data-model.md → Reference constants → Licence paragraph default); heading regex matches `# အခန်း (၁) - Title` for `my` and `# Chapter 3 - Title` for `en`, rejects each language's shape in the other, accepts Myanmar `၀-၉` and ASCII digits in both; the font set catalogue maps `my-sans`, `my-serif`, `en-sans`, `en-serif` to `Noto Sans Myanmar`, `Noto Serif Myanmar`, `Noto Sans`, `Noto Serif`
- [X] T010 [P] Implement `src/errors.ts` (`BookError`, `warn`) to pass T008
- [X] T011 [P] Implement `src/config/language.ts` (profiles, digit mapping `၀-၉`→`0-9`, heading regex builder using the configured label word, `u` flag; font set catalogue `{my,en}-{sans,serif}` → body family names as listed in T018): `my` = `^#\s+(<label>\s*\([၀-၉0-9]+\))\s*-\s*(.+?)\s*$`, `en` = `^#\s+(<label>\s+[၀-၉0-9]+)\s*-\s*(.+?)\s*$` (data-model.md → Reference constants) to pass T009
- [X] T012 First write `test/unit/config/schema.test.ts` and see it fail (Constitution VI): `z.toJSONSchema(schema, { io: "input" })` equals `contracts/book-config.schema.json` after normalising key order and removing `$schema`, `title` and `description` at every depth (if the zod output still differs in a keyword the contract does not use, compare only `type`, `required`, `properties`, `enum` and `default`, and record that in `docs/decision-log.md`); each required key missing → validation error naming it; wrong types rejected; enum values and defaults below. Then implement `src/config/schema.ts`: zod 4 schema matching `specs/001-core-manuscript-pipeline/contracts/book-config.schema.json` exactly — required `title`, `author`, `year`, `identifier`, `output_name`, `cover`, `chapter_glob`; `language` enum `"my" | "en"` default `"my"`; `font_set` enum `"sans" | "serif"` default `"sans"`; `recto_chapter_start` default `false`; `running_headers` default `true`; `strings` object with the keys of the contract; export inferred `BookConfig` type
- [X] T013 Implement `src/cli.ts` skeleton with `commander`, structured as an internal `runCli(argv, deps)` (deps: stdout/stderr writers and an optional `manifestPath` for tests; not exported from `src/index.ts`) plus the bin entry that calls it: commands `init` and `fonts` (wired later), reserved `pdf`, `epub`, `qa`, `all`, `web`, `serve`, `cover` that print `not available yet` and exit 1; top-level handler prints `BookError` message to stderr and exits 1; create `src/index.ts` as the public entry point, which will export only `init` and `fonts` (added in T077 and T065) and never re-exports internal modules (Constitution VIII)
- [X] T014 [P] Create fixture book `test/fixtures/book-mm/`: `book.json` (`language` `my`, `part_glob` set, `code_root` `../code`), `cover/cover.png` (1×1 PNG), `chapters/chapter-01.md` (CRLF line endings, non-NFC Burmese text, stacked consonants/kinzi/medials, two `##` sections, a callout pair, a `console` block, a `<!-- include: -->` marker), `chapters/chapter-02.md` (ASCII digits in label `အခန်း (2)`), `chapters/part-01.md` (`# Part I - Title`, `chapters: 1-2`). Synthetic text only; never copy the development-book manuscript
- [X] T015 [P] Create fixture book `test/fixtures/book-en/`: `book.json` (`language` `en`, no parts), `cover/cover.png`, `chapters/chapter-01.md` (`# Chapter 1 - Getting Started`), `chapters/chapter-02.md` (contains one Myanmar word for FR-046)
- [X] T016 [P] Create snippet sources `test/fixtures/code/`: `sample.ts` (named region, nested region, `//` markers), `sample.py` (`#` markers), `sample.sh`, `sample.json`, `sample.js`, `unclosed.ts` (region without end), `notes.txt` (unknown extension)

**Checkpoint**: Foundation ready — user stories can start

---

## Phase 3: User Story 1 - Configure a book (Priority: P1) 🎯 MVP

**Goal**: Load and validate `book.json` with resolved paths, language defaults and clear errors.

**Independent Test**: Load fixture configs (valid, missing cover, wrong types, unknown keys, empty
optional fields, placeholders) and check resolved values, warnings and errors.

### Tests for User Story 1 ⚠️ write first, see them fail

- [X] T017 [P] [US1] Write `test/unit/config/load.test.ts`: (1) valid config loads and every path resolves relative to the config file's directory; (2) `cover` empty or missing file → `BookError` naming the config file and cover path; (3) wrong type → stops naming the key; (4) unknown key at any depth → warning naming the key path (e.g. `strings.chapter_lable`), load continues; (5) empty `publisher`/`isbn` → `undefined`; (6) values containing `PLACEHOLDER` → `placeholders: {key, value}[]`; `language` absent → `"my"`; `language` other than `my`/`en` → stops listing valid values; `font_set` not in `sans`/`serif` → stops listing valid sets; explicit `strings` values win over profile defaults; changing `language` from `en` to `my` with an explicit `strings.chapter_label` of `Lesson` keeps `Lesson` while unset keys (e.g. `contents_heading`) switch to the `my` defaults; a config without `title` (missing required key) → `BookError` naming `title`, nothing else loaded; invalid JSON → stops naming the file
- [X] T018 [P] [US1] Write `test/unit/config/typeface.test.ts`: with `strings.typeface_line` absent, the loaded value is `Typeface: <body family>` for the configured set from the catalogue in `src/config/language.ts` (`my-sans` → `Noto Sans Myanmar`, matching the Python `Typeface: Noto Sans Myanmar`; `my-serif` → `Noto Serif Myanmar`; `en-sans` → `Noto Sans`; `en-serif` → `Noto Serif`); an explicit value wins
- [X] T019 [P] [US1] Write `test/unit/config/code-root.test.ts` using temp dirs: nearest ancestor with a `.git` directory wins; a `.git` file (worktree) also counts; no `.git` → config file's directory; explicit `code_root` resolves relative to the config file

### Implementation for User Story 1

- [X] T020 [P] [US1] Implement `src/config/code-root.ts` (walk up for `.git` entry; no `git` binary) to pass T019
- [X] T021 [US1] Implement `src/config/load.ts` `loadConfig(path)`: read + parse JSON, validate with `src/config/schema.ts`, collect unknown key paths as warnings, resolve paths, check cover exists, drop empty `publisher`/`isbn`, collect placeholders, merge `strings` over the language profile, default `typeface_line` from the font set catalogue, resolve `code_root` via T020; return `{ config, warnings, placeholders, configPath }`; pass T017 and T018
- [X] T022 [US1] Write `test/unit/public-api.test.ts`: the export names of `src/index.ts` are a subset of `init` and `fonts` and include none of the internal functions (`loadConfig`, `loadChapters`, `loadParts`, `tocListHtml`, `expandSnippets`, `renderMarkdown`, `renderChapter`, `chapterHeadHtml`); keep `loadConfig` internal (Constitution VIII)

**Checkpoint**: US1 independently testable (`npx vitest run test/unit/config`)

---

## Phase 4: User Story 2 - Write chapters and parts in Markdown (Priority: P1)

**Goal**: Load, order, number and title chapters; load parts; build the contents list.

**Independent Test**: Load `book-mm` and `book-en` fixtures and compare the chapter list, part
assignment and contents structure to expected values.

### Tests for User Story 2 ⚠️

- [X] T023 [P] [US2] Write `test/unit/manuscript/chapters.test.ts`: files ordered by code-point order (not locale); position-based `slug` `ch01`; `# အခန်း (၁) - Title` → label `အခန်း (၁)`, title `Title`, full title `အခန်း (၁) - Title`, number 1; ASCII digits `အခန်း (7)` → 7; `en` `# Chapter 3 - Title` → label `Chapter 3`, number 3; leading blank lines skipped; bad first line → `BookError` naming file and line; wrong-language heading shape stops; empty glob → `BookError` naming the glob; CRLF/non-NFC → LF/NFC in memory; body trimmed of blank lines both ends with one final `\n`; `##` sections listed; heading-only chapter → empty body and sections
- [X] T024 [P] [US2] Write `test/unit/manuscript/parts.test.ts`: first part whose `first <= number <= last` wins (overlap case); missing heading or `chapters:` line → `BookError` naming the file; chapter no part covers → `BookError` naming chapter file and number; no `part_glob` → no parts
- [X] T025 [P] [US2] Write `test/unit/manuscript/toc.test.ts`: flat `<ol><li><a href>full_title</a></li>…</ol>`; with parts `<ol class="toc-parts"><li class="toc-part"><span class="toc-part-title">Part I - Title</span><ol>…</ol></li></ol>`; part with no chapters omitted; titles HTML-escaped; `href` built from a slug format argument (data-model.md → Reference constants → Chapters and parts)
- [X] T026 [P] [US2] Write `test/unit/manuscript/source-unchanged.test.ts`: hash every file under `test/fixtures/book-mm/` before and after loading chapters and parts; hashes are identical (SC-005, Constitution II)
- [X] T027 [P] [US2] Write `test/unit/manuscript/glob.test.ts`: `fs/promises` `glob` for `chapters/chapter-*.md` and `chapters/part-*.md` returns the same set Python `glob.glob` would (dotfiles such as `.chapter-99.md` excluded; no recursion)

### Implementation for User Story 2

- [X] T028 [P] [US2] Implement `src/manuscript/text.ts` (`normalizeSource`: NFC + `\r\n`→`\n`; `compareCodePoints` using `<`)
- [X] T029 [US2] Implement `src/manuscript/chapters.ts` `loadChapters(config)`: glob via `fs/promises` `glob`, sort with `compareCodePoints`, parse heading with the language regex from `src/config/language.ts`, sections with `^##\s+(.+?)\s*$` (multiline), build `index`, `slug`, `label`, `title`, `fullTitle`, `number`, `sections`, `sourcePath`, `bodyMd` per data-model.md Chapter; read-only file access; pass T023, T026, T027
- [X] T030 [US2] Implement `src/manuscript/parts.ts` `loadParts(config, chapters)` with `PART_HEAD_RE` = `^#\s+(Part\s+[IVX]+)\s*-\s*(.+?)\s*$` and `PART_RANGE_RE` = `^chapters:\s*(\d+)\s*-\s*(\d+)\s*$` (multiline) from data-model.md → Reference constants; pass T024
- [X] T031 [P] [US2] Implement `src/manuscript/toc.ts` `tocListHtml(parts, chapters, hrefFormat)` porting `toc_list_html` (data-model.md → Reference constants); pass T025
- [X] T032 [US2] Keep `loadChapters`, `loadParts` and `tocListHtml` internal (not exported from `src/index.ts`, Constitution VIII); run `test/unit/public-api.test.ts` (T022) to confirm

**Checkpoint**: US2 independently testable

---

## Phase 5: User Story 3 - Include tested code (Priority: P1)

**Goal**: Expand `<!-- include: path[#region] -->` markers from `code_root`.

**Independent Test**: Expand fixture chapters with whole-file, region and nested includes, markers
inside fences, and every error path.

### Tests for User Story 3 ⚠️

- [X] T033 [P] [US3] Write `test/unit/manuscript/dedent.test.ts` matching Python `textwrap.dedent`: common leading whitespace removed; whitespace-only lines ignored for the margin and normalised to empty; tabs vs spaces mismatch keeps the common prefix only
- [X] T034 [P] [US3] Write `test/unit/manuscript/snippets.test.ts`: marker matched on the trimmed line (indentation and trailing spaces allowed); whole-file include drops every `//` and `#` region marker line; region include takes content to the matching `#endregion` with depth counting, drops nested markers, keeps their content, dedents, strips leading/trailing blank lines; markers inside ```` ``` ```` or `~~~` fences untouched, including after an unterminated fence; language map `.ts→ts .js→js .json→json .py→python .sh→bash`, other → no language; output ```` ```{lang}\n{code}\n``` ````; `includes` list records `path` or `path#region`; errors `file not found: {path}`, `region not found: {path}#{region}`, `region not closed: {path}#{region}` each as `BookError` naming the chapter; region names ASCII `[A-Za-z0-9_-]`

### Implementation for User Story 3

- [X] T035 [P] [US3] Implement `src/manuscript/dedent.ts` to pass T033
- [X] T036 [US3] Implement `src/manuscript/snippets.ts` `expandSnippets(chapter, codeRoot)` using `MARKER_RE` = `^<!--\s*include:\s*([^#\s]+)(?:#([A-Za-z0-9_-]+))?\s*-->\s*$`, `REGION_RE` = `^\s*(?://|#)\s*#(end)?region\b\s*([A-Za-z0-9_-]*)\s*$`, `FENCE_RE` = ``^\s*(```|~~~)`` (data-model.md → Reference constants), setting `chapter.expandedMd` and `chapter.includes`; pass T034
- [X] T037 [US3] Keep `expandSnippets` internal (not exported from `src/index.ts`, Constitution VIII); run `test/unit/public-api.test.ts` (T022) to confirm

**Checkpoint**: US3 independently testable

---

## Phase 6: User Story 4 - Rich Markdown rendering (Priority: P1)

**Goal**: Render chapters to well-formed XHTML with the Python toolchain's class vocabulary.

**Independent Test**: Render fixture Markdown for each feature and compare HTML structure, classes
and plain text to expected output.

### Tests for User Story 4 ⚠️

- [X] T038 [P] [US4] Write `test/unit/markdown/render.test.ts`: output parses with `fast-xml-parser` `XMLValidator` (well-formed XHTML); pipe tables render, `---:` right-aligns; `---` → `<hr />`; HTML comments pass through; two callouts separated only by blank lines stay separate (CommonMark, no splitter)
- [X] T039 [P] [US4] Write `test/unit/markdown/highlight.test.ts`: ts/js/json/python/bash blocks → `<pre class="code"><code class="language-X">` with spans using only these classes from data-model.md → Reference constants (`k kc kd kn kp kr kt ow`, `s s1 s2 sa sb sc dl sd se sh si sx sr ss`, `m mb mf mh mi mo il`, `c ch cm c1 cs cpf`, `nc nf fm nb bp`, `cp nd`, `err`); language name lower-cased; no language or unknown language → unchanged escaped block
- [X] T040 [P] [US4] Write `test/unit/markdown/console.test.ts`: `console`/`terminal`/`shell-session` → `<div class="terminal"><div class="terminal-bar">` + 3 `<span class="terminal-dot"></span>` + `</div><pre class="console"><code>…</code></pre></div>`; `$ ` lines → `<span class="gp">$ </span>` + bash-highlighted command; other lines → `<span class="go">`
- [X] T041 [P] [US4] Write `test/unit/markdown/callouts.test.ts`: `[!NOTE]`/`[!WARNING]`/`[!TRY]` (any case) → `<div class="callout callout-{kind}"><p class="callout-title">{Title}</p>{body}</div>` with an empty leading `<p></p>` removed; titles from `strings.callout_titles`; `[!X]` unknown stays a blockquote
- [X] T042 [P] [US4] Write `test/unit/markdown/wide.test.ts`: longest visible line > 56 → class `wide`, > 72 → `xwide` (not both); markup stripped and entities decoded before measuring; existing classes kept
- [X] T043 [P] [US4] Write `test/unit/markdown/plain-text.test.ts`: tags → space, entities decoded (HTML5 named entities as Python `html.unescape`), runs of spaces/tabs collapsed, newlines kept
- [X] T044 [P] [US4] Write `test/unit/markdown/chapter-head.test.ts`: `<header class="chapter-head"><p class="chapter-number">{label}</p><h1>{title}</h1></header>` with escaping (data-model.md → Reference constants)

### Implementation for User Story 4

- [X] T045 [P] [US4] Implement `src/markdown/highlight.ts`: `Prism.tokenize` with all components loaded; mapping table from research.md R-03, emitting only classes listed in data-model.md → Reference constants (`keyword`→`k`, `boolean`→`kc`, `string`→`s2`, `number`→`mi`, `comment`→`c1`, `function`→`nf`, `class-name`→`nc`, `builtin`→`nb`, unmapped → plain text); pass T039
- [X] T046 [P] [US4] Implement `src/markdown/console.ts` (console lexer + terminal wrapper) to pass T040
- [X] T047 [P] [US4] Implement `src/markdown/callouts.ts` porting `_callout` / `_CALLOUT_RE` to pass T041
- [X] T048 [P] [US4] Implement `src/markdown/wide.ts` porting `_tag_wide_pre` to pass T042
- [X] T049 [P] [US4] Implement `src/markdown/plain-text.ts` using `entities` decoding to pass T043
- [X] T050 [P] [US4] Implement `src/markdown/chapter-head.ts` to pass T044
- [X] T051 [US4] Implement `src/markdown/render.ts` `renderMarkdown(md, strings)`: markdown-it (`xhtmlOut: true`, `html: true`) → fenced-block highlighting (T045/T046) → callouts (T047) → wide tagging (T048); `renderChapter(chapter, strings)` sets `html` and `plainText`; pass T038
- [X] T052 [US4] Keep `renderMarkdown`, `renderChapter` and `chapterHeadHtml` internal (not exported from `src/index.ts`, Constitution VIII); run `test/unit/public-api.test.ts` (T022) to confirm

**Checkpoint**: US4 independently testable

---

## Phase 7: User Story 5 - Book fonts (Priority: P1)

**Goal**: Fetch, verify and cache a curated font set; detect uncovered characters.

**Independent Test**: Run the fonts command against `test/fixtures/fonts-source/`, then check cache
contents, coverage and offline / missing-font behaviour.

### Fixtures and tests for User Story 5 ⚠️

- [X] T053 [US5] Maintainer step (needs Python 3 with fontTools and a local `development-book` checkout whose `publish/fonts/*.ttf` are present; those files are git-ignored there): create `scripts/make-font-fixtures.py` that subsets fonts from `development-book/publish/fonts/` with fontTools (`pyftsubset`) to a few glyphs (`a`, `U+1000`–`U+1005` for Myanmar faces; Latin only for English stand-ins), writes seven faces per set plus `LICENSE-OFL.txt` into `test/fixtures/fonts-source/`, and writes `test/fixtures/fonts-source/fonts-manifest.json` with SHA-256 per file and all four sets `my-sans`, `my-serif`, `en-sans`, `en-serif` (shape per `contracts/font-manifest.md`); `my-serif` reuses the trimmed `my-sans` faces and `en-serif` the trimmed `en-sans` faces (same files listed under both sets); keep every file a few KB; run it once and commit the outputs
- [X] T054 [P] [US5] Write `test/unit/fonts/manifest.test.ts` against the fixture manifest `test/fixtures/fonts-source/fonts-manifest.json` only: `sets` keys exactly `my-sans`, `my-serif`, `en-sans`, `en-serif`; each set has seven faces with roles `body-regular`, `body-semibold`, `body-bold`, `body-italic`, `body-bolditalic`, `mono-regular`, `mono-bold`, plus `licence`; every `sha256` is 64 hex characters; lookup by (`language`, `font_set`); unknown set → `BookError` listing valid sets; a manifest missing a set or a role fails validation. (Real file names are checked after T067 by T066's release test.)
- [X] T055 [P] [US5] Write `test/unit/fonts/cache.test.ts` (every call that needs a manifest gets the fixture manifest through the internal `manifestPath` option): cache root precedence `--fonts` → `MD2BOOK_FONTS` → `$XDG_CACHE_HOME/md2book/fonts` → `~/.cache/md2book/fonts`; set directory `<root>/<set-id>/`; switching `font_set` from `en-sans` to `en-serif` after fetching `en-sans` leaves `<root>/en-sans/` untouched and `requireFontSet` for `en-serif` fails until it is fetched
- [X] T056 [P] [US5] Write `test/unit/fonts/fetch.test.ts`, passing the fixture manifest `test/fixtures/fonts-source/fonts-manifest.json` through the internal `manifestPath` option of `fetchFontSet`, with `MD2BOOK_FONTS_SOURCE` = fixture dir: all faces + licence copied and verified; files already present with the right SHA-256 are not fetched again; SHA-256 mismatch → `BookError` naming the file and no file left in the cache (temp + rename); URL source: serve `test/fixtures/fonts-source/` from a `node:http` server on `127.0.0.1` (random port), set `MD2BOOK_FONTS_SOURCE=http://127.0.0.1:<port>/`, and assert the same verified result (hashes still come from the injected fixture manifest, never from the server); a non-local URL is rejected by the T004 guard
- [X] T057 [P] [US5] Write `test/unit/fonts/require.test.ts` using the fixture manifest via `manifestPath`: a missing face → `BookError` `<cache dir>: font set <id> not found; run: book-build fonts --config <path>` (FR-042)
- [X] T058 [P] [US5] Write `test/unit/fonts/coverage.test.ts`: with `en-sans` fixture, the Myanmar word in `book-en` chapter 2 → one warning per (file, character) and returned `{file, char}` records; with `my-sans`, Myanmar + Latin text → no warnings; every `my-*` fixture face covers `U+1000` and `a`, every `en-*` fixture face covers `a` (fixture check; real fonts are checked in T066/T067)
- [X] T059 [P] [US5] Write `test/integration/cli-fonts.test.ts`, running the CLI in-process via `runCli` (T013) with `manifestPath` = the fixture manifest: `book-build fonts --config test/fixtures/book-en/book.json` with source/cache env vars exits 0 and prints the cache dir; `--set xx-sans` exits 1 with one line listing valid sets

### Implementation for User Story 5

- [X] T060 [P] [US5] Implement `src/fonts/manifest.ts` (load the shipped `assets/fonts-manifest.json`, or the file given by the internal `manifestPath` option used only by tests; never read a manifest from `MD2BOOK_FONTS_SOURCE` or any download source, and expose no CLI flag or environment variable for it; validate the four-set, seven-role shape for both manifests with the same validator; `getFontSet(language, style)`) to pass T054
- [X] T061 [P] [US5] Implement `src/fonts/cache.ts` to pass T055
- [X] T062 [US5] Implement `src/fonts/fetch.ts` `fetchFontSet(set, opts)`: source = `MD2BOOK_FONTS_SOURCE` (URL or local dir) else manifest `base_url`; `fetch` or file copy to a temp name, SHA-256 via `node:crypto` checked against the loaded manifest, rename on match, delete on mismatch; pass T056
- [X] T063 [US5] Implement `src/fonts/require.ts` `requireFontSet(config, { manifestPath? })` (same internal, test-only option as T060; loads the manifest via `src/fonts/manifest.ts`) to pass T055 and T057
- [X] T064 [US5] Implement `src/fonts/coverage.ts` `checkCoverage(chapters, set)` with `fontkit` `hasGlyphForCodePoint` on the `body-regular` face, ignoring whitespace; sets `chapter.uncovered` and warns via `src/errors.ts` (FR-046); pass T058
- [X] T065 [US5] Wire `book-build fonts` (`--config`, `--set`, `--fonts`) in `src/cli.ts` (`runCli` passes `deps.manifestPath` through) and export async `fonts({ config?, set?, fontsDir? })` returning `{ dir, files }` from `src/index.ts`; pass T059
- [X] T066 [US5] First write `test/release/fonts-manifest.test.ts` (run by `npm run test:release`, excluded from `npm run check`): `assets/fonts-manifest.json` passes the T060 validator and `my-sans` lists exactly the seven file names in data-model.md → Reference constants → `my-sans` font files. Then create `scripts/build-fonts.py` from `development-book/publish/fonts.py`: per-set face tables for `my-sans` (the existing `FACES` table in `development-book/publish/fonts.py`, producing exactly the file names in data-model.md → Reference constants), `my-serif` (Noto Serif Myanmar + Noto Serif, Latin scale 0.93, oblique 12° with GPOS anchor shift; mono shared with `my-sans`), `en-sans` and `en-serif` (stock Noto Sans / Noto Serif body faces, no merge; all four sets share the merged `NotoSansMono-*.ttf` mono files of `my-sans`); writes files and `assets/fonts-manifest.json` with SHA-256 and `base_url` placeholder `<GitHub release download URL for fonts-v1>/`; report any upstream face (e.g. SemiBold) that is missing instead of substituting silently; after building, open every generated face with fontTools and exit non-zero if any face of a `my-*` set lacks `U+1000` or `a`, or any face of an `en-*` set lacks `a` (SC-006), or if a set's `body_family` differs from the catalogue in `src/config/language.ts` (T011)
- [X] T067 [US5] Run `scripts/build-fonts.py` locally (network to the Noto GitHub releases is allowed for this maintainer step); confirm its SC-006 coverage check passes for all four real sets and record the output in `docs/decision-log.md`; run `npm run test:release` (T066 test) and confirm it passes; commit the generated `assets/fonts-manifest.json`; keep the font binaries out of git

**Checkpoint**: US5 independently testable offline

---

## Phase 8: User Story 6 - Start a new book project (Priority: P1)

**Goal**: `book-build init` scaffolds `book.json` + `chapters/chapter-01.md` for `my`/`en` with a
curated font set.

**Independent Test**: Run init in empty temp dirs for all four language × font-set combinations
(flags and prompts), then load and render the result with US1–US4.

### Tests for User Story 6 ⚠️

- [X] T068 [P] [US6] Write `test/unit/init/slug.test.ts`: `Data Structures & Algorithms` → `data-structures-algorithms`; `ဒေတာ` → `book`; lower-cased, runs of non-`a-z0-9` → one hyphen, leading/trailing hyphens removed
- [X] T069 [P] [US6] Write `test/unit/init/options.test.ts`: `my`, `mm`, `Myanmar` (any case) → `my`; `en`, `English` → `en`; other → `BookError` listing valid values; `--font` default `sans`, invalid → `BookError` listing `sans`, `serif`
- [X] T070 [P] [US6] Write `test/integration/init.test.ts` (temp dirs, non-TTY): for each of the 4 combinations with flags, files `book.json` and `chapters/chapter-01.md` exist; `loadConfig` on the fresh project throws exactly one `BookError`, naming `cover/cover.png` (no bypass option exists or is added); after the test copies a 1×1 PNG to `cover/cover.png`, `loadConfig` succeeds and `language` is `my`/`en`; `font_set` recorded; `identifier` matches `^urn:uuid:[0-9a-f-]{36}$`; `year` is the current year; `output_name` is the title slug; `chapter_glob` is `chapters/chapter-*.md`; `cover` is `cover/cover.png`; `strings.licence_text` is `This work is licensed under the MIT License. https://opensource.org/license/mit`; sample chapter heading is `# အခန်း (၁) - …` for `my` and `# Chapter 1 - …` for `en`; loading + rendering the sample chapter succeeds; SC-008 timing: for each combination, measure with `performance.now()` from the empty directory through init, the first `loadConfig` (cover error), the cover copy, `loadConfig`, `loadChapters` and `renderChapter` and assert < 60 000 ms (the spec limit, not a tighter micro-benchmark); existing `book.json` or chapter → exit 1 naming it and nothing written; missing `--lang`/`--title`/`--author` without TTY → exit 1 naming the flag; output ends with `book-build fonts --config <dir>/book.json`; no network
- [X] T071 [P] [US6] Write `test/unit/init/prompts.test.ts`: with a fake TTY input stream, missing values are prompted in order language → font set (default `sans`) → title → author

### Implementation for User Story 6

- [X] T072 [P] [US6] Implement `src/init/slug.ts` to pass T068
- [X] T073 [P] [US6] Implement `src/init/options.ts` (normalise language and font set) to pass T069
- [X] T074 [P] [US6] Implement `src/init/templates.ts`: `bookJson(request)` (fields listed in T070; `identifier` via `crypto.randomUUID()`) and `sampleChapter(language)` using the language profile's label word and digits
- [X] T075 [US6] Implement `src/init/prompts.ts` with `node:readline/promises`, only when `process.stdin.isTTY`; pass T071
- [X] T076 [US6] Implement `src/init/init.ts` `init({ dir?, lang, font?, title, author })`: check both targets do not exist before writing anything; create `chapters/`; write files; return `{ files }`
- [X] T077 [US6] Wire `book-build init [dir]` (`--lang`, `--font`, `--title`, `--author`) in `src/cli.ts` and export `init` from `src/index.ts`; pass T070; tighten `test/unit/public-api.test.ts` (T022) to assert the export names equal exactly `init` and `fonts`

**Checkpoint**: All six stories independently testable

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Equivalence gate, performance, docs, final validation

- [X] T078 [P] Create `scripts/dump-python-reference.py`: with `DEVBOOK` pointing at `development-book` (`d235dbd`), import `publish/build.py`, load and render `book-01`, and print JSON with per-chapter `index`, `slug`, `label`, `title`, `number`, `sections`, part assignment, `plain_text`, and counts of terminal blocks, `pre.code` blocks, `wide`, `xwide`, tables and each callout kind
- [X] T079 Create `scripts/equivalence.ts` (`npm run equivalence -- --book book-01`): run T078, run our pipeline on `$DEVBOOK/publish/books/book-01.json`, diff chapter data (SC-001), plain text ignoring whitespace (SC-002) and structure counts (SC-003); exit non-zero on any difference; never copy manuscript files into this repo
- [X] T080 [P] Write `test/integration/pipeline.test.ts`: full pipeline (config → chapters → parts → snippets → render → coverage) on `book-mm` and `book-en`, hashing every file under `test/fixtures/` (books, `code/`, `fonts-source/`) before and after the full run and asserting they are identical (SC-005); a synthetic 20-chapter book generated in a temp dir loads and renders in < 10 s on the Linux CI runner (SC-007)
- [X] T081 [P] Write `test/unit/errors-catalog.test.ts` asserting every SC-004 error (missing cover, empty glob, bad chapter heading, bad part file, chapter not covered by any part, three snippet errors, missing fonts, wrong config type, unsupported language or font set, init target present) produces exactly one line naming the file, key or command
- [X] T082 [P] Write root `README.md` (real package docs): install (Node 26+, `nvm use`), `book-build init`, `book-build fonts`, config keys (link the contract), languages and font sets, licence notes (MIT package; fonts SIL OFL 1.1). Code lines in examples ≤ 72 characters
- [X] T083 Update `docs/decision-log.md` with any difference found by T079 and any font face missing in T066
- [X] T084 Run `npm run check`, then every step of `specs/001-core-manuscript-pipeline/quickstart.md`, and record results
- [ ] T085 Manual visual check (US5 scenario 7): render Burmese text with vowel signs in the `my-sans` and `my-serif` italic faces and confirm glyphs are slanted and vowel signs stay attached; note the result in `docs/decision-log.md`
- [X] T086 Maintainer step, needs explicit approval: publish the `fonts-v1` GitHub release with the font files from T067 and replace the `base_url` placeholder in `assets/fonts-manifest.json`
- [X] T087 Create `.github/workflows/ci.yml`: on push and pull request, `ubuntu-latest`, Node 26 (`actions/setup-node` with `node-version-file: .nvmrc`), `npm ci`, `npm run check`; this is the Linux CI runner SC-007 refers to and the merge gate (constitution Development Workflow)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup; blocks all stories
- **US1–US4 (Phases 3–6)**: depend on Foundational only; can run in parallel
- **US5 (Phase 7)**: depends on Foundational; T059/T065 (`--config`) also need US1 `loadConfig`; T058 needs US4 `plainText` (or constructs it directly)
- **Font assets ordering**: T053–T065 use only the committed fixture manifest (injected via `manifestPath` into `fetchFontSet`, `requireFontSet` and `runCli`) and fixture faces. Real assets exist only after T067; the only checks on them (T066's `test/release` test and the build script's SC-006 coverage check) run in T067, outside `npm run check`
- **US6 (Phase 8)**: depends on US1 (config validation) and, for T070's load-and-render check, US2 + US4
- **Polish (Phase 9)**: T078–T081 need US1–US5; T082–T087 need all stories

### User Story Dependencies

```text
Foundational ─┬─ US1 Config ───────┬─ US5 Fonts (--config path)
              ├─ US2 Chapters ─────┤
              ├─ US3 Snippets      ├─ US6 Init (load + render check)
              └─ US4 Markdown ─────┘
```

### Within Each User Story

- Tests written and failing before implementation (Constitution VI)
- Pure helpers (`text`, `dedent`, `slug`, markdown passes) before the modules that compose them
- Export from `src/index.ts` last

### Parallel Opportunities

- Setup: T003–T007
- Foundational: T008/T009 then T010/T011; fixtures T014–T016
- After Foundational: US1, US2, US3 and US4 in parallel
- Inside stories: all test tasks marked [P]; US4 passes T045–T050

---

## Parallel Example: User Story 4

```bash
# Tests together:
Task: "Write test/unit/markdown/highlight.test.ts"
Task: "Write test/unit/markdown/console.test.ts"
Task: "Write test/unit/markdown/callouts.test.ts"
Task: "Write test/unit/markdown/wide.test.ts"

# Then the independent passes together:
Task: "Implement src/markdown/highlight.ts"
Task: "Implement src/markdown/callouts.ts"
Task: "Implement src/markdown/wide.ts"
Task: "Implement src/markdown/plain-text.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1 → validate: `npx vitest run test/unit/config`
3. Stop and review before continuing

### Incremental Delivery

1. US1 → US2 → US3 → US4: the manuscript pipeline (library only)
2. US5: `book-build fonts` (first author-facing command)
3. US6: `book-build init` (completes the slice's CLI)
4. Phase 9: equivalence gate against `book-01`, docs, quickstart

---

## Notes

- [P] = different files, no dependency on unfinished tasks
- Never write to files under a fixture's `chapters/` from code under test
- Commit after each task or logical group (Conventional Commits, single line, no AI co-author)
- `reference/` is git-ignored reference material; never commit it or copy it to `docs/`
