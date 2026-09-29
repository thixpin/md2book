# Research: Core Manuscript Pipeline

Versions checked with `npm view` on 2026-09-28. Source behaviour checked in
`development-book/publish/build.py` and `fonts.py` at `d235dbd`.

## R-01 Node.js floor and tool versions

- **Decision**: Node.js 26+ (user decision; constitution amended to v1.1.0). `engines.node`
  `>=26`, `.nvmrc` `26`. Tools: `commander` ^15 (`node >=22.12`), `vitest` ^5
  (`>=26.0.0` supported), `typescript` ~6.0.3 (`typescript-eslint` peers `typescript <6.1.0`,
  so TypeScript 7 is not used yet).
- **Rationale**: Node.js 20 reached end-of-life on 2026-04-30. Node 26 is the newest line
  (v26.10.0, 2026-09-21) and makes `fs.glob` available (stable since v24.0.0), removing a glob
  dependency.
- **Risk**: Node 26 is still the "Current" line on 2026-09-28; it becomes LTS in late October
  2026. Until then CI pins the latest 26.x. The local machine runs Node 20.20.2 and needs Node 26
  installed (`nvm install 26`).
- **Alternatives considered**: Node 24 LTS (widest adoption today, but the user chose 26); Node
  20 (end-of-life).

## R-02 Markdown engine

- **Decision**: `markdown-it` 15 with `xhtmlOut: true`, `html: true` (HTML comments pass through),
  built-in GFM tables, default fences. No blockquote splitter.
- **Rationale**: Python used python-markdown, which merges blockquotes separated by blank lines;
  `_split_blockquotes` inserted `<!-- -->` to stop that. CommonMark ends a blockquote at a blank
  line, so adjacent callouts already stay separate. A fixture test pins this (spec US-4 #7).
  `<hr />` is emitted for `---`; the scene break is CSS (`hr::after`), so HTML stays `<hr />`.
- **Alternatives considered**: `marked`, `remark`/`unified`. Rejected: `marked` has weaker XHTML
  output control; `unified` adds an AST toolchain the pipeline does not need.

## R-03 Syntax highlighting (plan-input D1)

- **Decision**: Option (b): `prismjs` 1.30 `Prism.tokenize()` plus a small renderer that maps
  Prism token types to the Pygments short classes of REF §4 (e.g. `keyword`→`k`,
  `boolean`→`kc`, `string`→`s2`, `number`→`mi`, `comment`→`c1`, `function`→`nf`,
  `class-name`→`nc`, `builtin`→`nb`; unmapped types render as plain text). Output shape is
  `<pre class="code"><code class="language-X">…</code></pre>` as in Python.
- **Console blocks**: a local lexer for `console`/`terminal`/`shell-session`: a line starting
  `$ ` → `<span class="gp">$ </span>` + the command highlighted as bash; any other line →
  `<span class="go">…</span>`. Wrapped in the terminal markup of REF §4.
- **Known vs unknown language**: "known" = a language Prism has loaded (all components) or one
  of its aliases; otherwise the block is left as markdown-it rendered it (escaped). Language
  names are lower-cased first, as Python does.
- **Rationale**: `Prism.tokenize` is a documented, synchronous API returning a token tree with
  types, so the mapping is a pure function and the existing CSS carries over unchanged.
  `book-01` uses only ```` ```console ````, so the console lexer is what the equivalence gate
  exercises; the mapping covers the snippet languages (ts, js, json, python, bash).
- **Alternatives considered**: `highlight.js` (token classes come from its HTML emitter; mapping
  needs its internal emitter API); `shiki` (async, TextMate scopes, inline styles by default).
- **Decision-log entry**: token boundaries can differ from Pygments; Pygments console lexer also
  recognises `#`/`%`/`>` prompts, ours only `$ ` (plan-input D1).

## R-04 Callouts

- **Decision**: post-process the rendered HTML like Python: a `<blockquote>` whose first `<p>`
  starts with `[!KIND]` becomes a callout; kind is upper-cased before lookup (so `[!note]` works,
  as in Python); unknown kinds stay blockquotes. Titles come from `strings.callout_titles`.
- **Rationale**: matches `build.py:_callout` exactly, including case-insensitivity.
- **Alternatives considered**: a markdown-it plugin. Equivalent, but the regex port keeps the
  behaviour one-to-one with the reference.

## R-05 Font sets, hosting and build (plan-input D2)

- **Decision**: Option (a). Four curated sets: `my-sans`, `my-serif`, `en-sans`, `en-serif`.
  Each set has seven faces: body regular, semibold, bold, italic, bold italic; mono regular,
  bold. Files are published as assets of a versioned GitHub release of this repo
  (`fonts-v<N>`), one file per face plus the licence file. The package ships
  `assets/fonts-manifest.json` with per-file SHA-256 and CSS family names.
- **Set contents**:
  - `my-sans`: exactly the seven files of REF §7 (current behaviour).
  - `my-serif`: Noto Serif Myanmar merged with Noto Serif (Latin scaled 0.93, Myanmar oblique
    12° for italics), mono shared with `my-sans`.
  - `en-sans` / `en-serif`: stock Noto Sans / Noto Serif body faces; no merge needed. All four
    sets share the merged `NotoSansMono-*.ttf` files of `my-sans` (Latin + Myanmar), because a
    flat release cannot hold two different files with the REF §7 mono names (decision log).
  - Which exact upstream faces exist (e.g. a SemiBold cut in each release) is confirmed when the
    script is run; the manifest records what was built.
- **Build**: `scripts/build-fonts.py` = `publish/fonts.py` extended with per-set face tables.
  Maintainer-only; output is uploaded to the release.
- **Rationale**: no Node equivalent of fontTools merge/oblique (R1); OFL allows redistribution;
  checksums make downloads verifiable.
- **Alternatives considered**: (b) `uvx` fontTools at user run time (forces Python on users);
  (c) Pyodide (heavy); separate `@thixpin/md2book-fonts` npm package (four sets make install
  size large for users who need one).

## R-06 Font cache and source override (plan-input D3)

- **Decision**: cache root precedence: `--fonts <dir>` → `MD2BOOK_FONTS` →
  `$XDG_CACHE_HOME/md2book/fonts` → `~/.cache/md2book/fonts`; each set in `<root>/<set-id>/`.
  Download source precedence: `MD2BOOK_FONTS_SOURCE` (URL or local directory) → the release URL
  in the manifest. Files are written to a temp name, SHA-256 checked, then renamed; a mismatch
  deletes the temp file and stops.
- **Rationale**: the source override makes tests and mirrors work offline (Constitution VI);
  atomic rename means a cache never holds a half-written face.
- **Alternatives considered**: project-local `node_modules/.cache` (lost on reinstall, not
  shared across books); OS-specific cache dirs (more code, no user benefit here).

## R-07 CLI parser

- **Decision**: `commander` ^15.
- **Rationale**: stable, typed, supports Node 26; subcommands with per-command options fit
  `md2book <command>`.
- **Alternatives considered**: `cac` 7 (smaller, fewer typed-option guarantees); `node:util`
  `parseArgs` (no subcommand help).

## R-08 Init prompts

- **Decision**: `node:readline/promises`, only when `process.stdin.isTTY`; otherwise every
  choice must come from flags (FR-061).
- **Rationale**: four simple questions do not justify a prompt library (Constitution VIII).
- **Alternatives considered**: `@inquirer/prompts` (nicer selects, one more dependency).

## R-09 Config schema

- **Decision**: `zod` 4 object schema covering all REF §1 keys plus `language`, `font_set`,
  `code_root` and `strings`. Unknown keys: parse with a loose object, then warn for keys not in
  the schema. Unknown keys are reported at any depth as a key path. The JSON Schema contract
  (`contracts/book-config.schema.json`) is compared in a test with `z.toJSONSchema()` output
  after normalising key order and ignoring annotation-only keywords (`$schema`, `title`,
  `description`), so the two cannot drift.
- **Rationale**: one source of truth for types and messages; the constitution names the config
  schema as the compatibility surface.
- **Alternatives considered**: hand-written validation (more code); `ajv` with the JSON Schema
  as source (types must then be generated).

## R-10 Globs, sorting, Unicode (plan-input R9)

- **Decision**: `fs/promises` `glob` (stable since Node 24) for globs, no library; sort with plain `<` comparison (code-point order, like
  Python `sorted()`), never `localeCompare`. A fixture test confirms `fs.glob` matches Python
  `glob.glob` for the REF §1 patterns (`chapter-*.md`, `part-*.md`), including dotfiles. Text: `normalize('NFC')`, `\r\n` → `\n`. Regexes
  with Myanmar ranges use the `u` flag. Snippet region names are ASCII `[A-Za-z0-9_-]` (Python
  `\w` is Unicode-aware; identifiers are ASCII in practice; recorded in the decision log).
- **Dedent**: a local function matching `textwrap.dedent` (common leading whitespace;
  whitespace-only lines ignored and normalised).

## R-11 Code root default

- **Decision**: walk up from the config file's directory looking for a `.git` entry (directory or
  file, to support worktrees); the first match is the code root, otherwise the config directory.
  No `git` binary is invoked.
- **Rationale**: matches the Python default for `development-book` without a process spawn.

## R-12 Coverage check (FR-046)

- **Decision**: `fontkit` 2 opens the set's body-regular face; each distinct non-whitespace
  character in a chapter's plain text is checked with `hasGlyphForCodePoint`; uncovered
  characters produce one warning per (file, character) and are returned for the QA report.
- **Rationale**: read-only cmap access is easy in Node (plan-input dependency map); the QA slice
  reuses the same reader for typeface coverage.
- **Alternatives considered**: `opentype.js` (heavier parse); a Unicode-block heuristic (misses
  real coverage gaps).

## R-13 Plain text and entity decoding

- **Decision**: port `html_to_text`: replace tags with a space, decode entities with `entities`
  (HTML5 decoding, like Python `html.unescape`), collapse runs of spaces/tabs.
- **Rationale**: SC-002 compares this text with the Python output; the decoder must agree on
  named entities.
