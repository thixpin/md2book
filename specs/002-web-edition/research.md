# Research: Web Edition

Sources: `development-book/publish/web.py` and `web-reader.js` at `d235dbd`; versions checked with
`npm view` on 2026-09-28.

## R-01 Carrying the reader and CSS over

- **Decision**: copy `web-reader.js`, `css/common.css` and `WEB_CSS` (web.py lines 28–332)
  byte-for-byte into `assets/`, then make three minimal edits to the reader: folio digits from
  `data-folio-digits` (`myanmar` default), and page names from `data-name-cover`,
  `data-name-contents`, `data-name-back-cover` (defaults `Cover`, `Contents`, `Back cover`). The
  build writes these attributes only when they differ from the defaults, so the `book-01` DOM
  equals the reference.
- **Rationale**: plan-input D4 (constants and fixes are behaviour); FR-021 needs English books.
- **Alternatives**: TypeScript port (risk, see plan Complexity Tracking); leave hard-coded (breaks
  English folios and configurable page names from feature 001 FR-007).

## R-02 Fonts in the stylesheet

- **Decision**: the stylesheet is `common.css + "\n" + web.css` (as the reference). For `my-sans`
  it is used unchanged, so its hash equals the reference hash. For other sets the build replaces
  the family names `Noto Sans Myanmar` → set `body_family`, `Noto Sans Mono` → `mono_family`, and
  the three `@font-face` file names → the set's `body-regular`, `body-bold`, `mono-regular` files.
  `fonts/` receives every file of the configured set plus `LICENSE-OFL.txt`.
- **Rationale**: FR-011; minimal textual substitution, no theme engine (Constitution VIII).
- **Alternatives**: CSS custom properties for families (changes the carried CSS for every book).

## R-03 Raster images

- **Decision**: `sharp` ^0.35 (Node ≥ 20.9): read cover pixels (`raw()`), sample the edges exactly
  as the reference (columns 1 and w-2 every `h//40` rows; rows 1 and h-2 every `w//40` columns),
  compose the 1200×630 share image (edge-colour background, cover resized to height 630 and
  centred at `(1200 - 630·ratio)/2`), and render `favicon.svg` to 32 and 180 px PNGs.
- **Rationale**: one prebuilt native dependency covers PNG/JPEG decode, compositing and SVG
  rendering (plan-input rows for PyMuPDF raster work).
- **Alternatives**: `@resvg/resvg-js` for SVG (a second dependency for one job); pure-JS PNG
  codecs (no JPEG, slower).

## R-04 Generated back cover

- **Decision**: Playwright ^1.63 Chromium renders an 850 × round(850/ratio) px HTML page: edge
  colour background; title in the set's body-bold face at 26 px inside x `[0.14w, 0.86w]`, y
  `[0.08h, 0.20h]`; author in body-regular at 18 px inside y `[0.88h, 0.95h]`; colour
  `rgb(245 242 235)` (0.96/0.95/0.92); screenshot to `back-cover.png`. If Chromium is not
  installed the build stops with `run: npx playwright install chromium`.
- **Rationale**: plan-input ("Playwright screenshot of a small HTML template… shapes Burmese
  correctly").
- **Alternatives**: `sharp` text (Pango) — flagged by plan-input as unreliable for Myanmar.

## R-05 Serve

- **Decision**: `node:http` static server bound to `127.0.0.1`, default port 8000: `/` and
  directories → `index.html`; known extensions get a content type; unknown paths →
  `404.html` with status 404; paths are resolved inside `web/` only (no `..` escape). A busy
  port stops with one line naming it.
- **Rationale**: no dependency needed; the reference used Python's `http.server`.
- **Alternatives**: `sirv` (plan-input suggestion; unnecessary for a local preview).

## R-06 Web chapters and book key

- **Decision**: `loadPublishedChapters(config)` validates `web_published_chapters` like the
  reference (non-empty list of strings; each a plain `.md` name in the chapter directory; exists;
  no duplicates; unique numbers), then parses each with the shared heading parser; `index` =
  chapter number, so the slug is `ch{number:02}`. Book key =
  `{storage_prefix}:{out dir name}:{sha256(join(expandedMd))[:10]}` (the reference hashes the
  body after snippet expansion).
- **Rationale**: FR-002/003/010; only listed files are opened (Constitution V).

## R-07 Browser tests

- **Decision**: Vitest + the Playwright library in `test/e2e/` (separate config and
  `npm run test:e2e`), serving a built fixture site with `serve.ts` on a random local port.
  Device matrix of REF §10 as viewport/touch/scale settings; checks: spread vs single page by
  measured page boxes, spine centre, controls inside viewport, no horizontal scroll, ≥ 44 px
  targets on touch; behaviour: open/close, keys, buttons, swipe, back swipe, bookmarks and
  position with `localStorage` blocked, search, URL/title, delayed CSS/fonts via route delay.
- **Rationale**: one test runner for the project; Playwright library drives Chromium.
- **Alternatives**: Playwright Test (a second runner; plan-input suggested it — recorded as a
  deliberate difference).

## R-08 Description cutter

- **Decision**: port `page_description`: first `<p>…</p>` (non-greedy, dotall), tags removed,
  entities decoded, whitespace collapsed; ≤ 155 code points → as is; else cut at the last space
  before 155 (hard cut if none), strip trailing ` ,.;:–-`, append `…`.
