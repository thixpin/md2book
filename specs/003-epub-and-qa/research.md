# Research: EPUB and QA Report

Versions checked with `npm view` on 2026-09-29; epubcheck locally: EPUBCheck v5.3.0.

## R-01 Zip writing and reading

- **Decision**: `yazl` ^3.3 writes the EPUB: `mimetype` added first with `compress: false`, then
  every other file of `src/epub/` in sorted path order with `compress: true` (deflate), matching
  the reference loop. `yauzl` ^3.4 reads entries (order, compression method, content) for QA.
- **Rationale**: plan-input R8 (most Node zip libraries write in insertion order; add `mimetype`
  first, stored, no extra fields); yazl adds no extra fields to stored entries by default.
- **Alternatives**: `archiver` (streams, larger, extra-field behaviour needs checking);
  hand-written zip (unnecessary).

## R-02 XHTML well-formedness (QA)

- **Decision**: `fast-xml-parser` `XMLValidator.validate` per `.xhtml` entry (reference:
  `ElementTree.fromstring`). Moves from devDependency to dependency.

## R-03 Coverage

- **Decision**: union of the cmaps of the set's `body-regular` and `mono-regular` faces (the
  reference used the Myanmar body and mono files); "Myanmar" = U+1000–109F ∪ U+A9E0–AA7F; count
  characters of `plainText` with code point > 32 that are not whitespace (Python `isspace`);
  uncovered characters listed with `U+XXXX NAME xN`, sorted by count descending (stable for ties,
  first-seen order as Python's `Counter`), names from `unicode-name` (fallback `?`).
- **Rationale**: FR spec US-2 #4; names needed for parity with `unicodedata.name`.

## R-04 Python semantics to match

- `str.split()` token count = split on Unicode whitespace runs; `len` = code points.
- `re.sub(r"\s", "", t)` = remove Unicode whitespace.
- Category `Cc` except `\n`, `\t`: U+0000–001F and U+007F–009F.
- Line numbers: `raw.count("\n", 0, m.start()) + 1` on the raw (un-normalised) source.
- Repeated word: `(?<!\S)(\S{2,})\s+\1(?!\S)` per line with a Myanmar letter and length ≥ 4;
  JS needs the `u` flag and lookbehind (supported).
- `!r` quoting in messages: Python `repr` of a short string → `'…'` (single quotes unless the text
  contains a single quote). Ported with a small `pyRepr`.
- Numbers use thousands separators (`{:,}`) → `toLocaleString("en-US")`.

## R-05 Report prose

- **Decision**: port every line of `qa.run` except: the Em dash search section and the EPUB
  "Em dash inside EPUB" line (removed by clarification); the typeface bullets become three
  generic bullets built from the set's `body_family`/`mono_family` and the manifest faces; the
  "(author's convention after Latin words; not changed)" suffix becomes "(reported, not changed)";
  the PDF section prints `- PDF not built.`. The closing sections are kept verbatim.
- **Rationale**: clarification session 2026-09-29.

## R-06 Shared book loading

- **Decision**: `loadBook(config)` = `loadChapters` → `loadParts` → `expandSnippets` →
  `renderChapter`, returning `{ chapters, parts }`; used by epub, qa and all. The web build keeps
  its allow-list loader.

## R-07 Stylesheets

- **Decision**: carry `publish/css/epub.css` byte-for-byte into `assets/css/epub.css`; generalise
  `web/assets.ts` font substitution into `substituteFonts(css, set)` so `common.css` and `epub.css`
  get the same family/file replacement for sets other than `my-sans` (epub.css names all five body
  faces and both mono faces).

## R-08 epubcheck

- **Decision**: look up `epubcheck` on `PATH` (no install); run it on the built file; capture
  stdout + stderr, keep the last 4000 characters; exit status 0 → PASS. Missing → `NOT RUN
  (epubcheck not installed; brew install epubcheck)`.
