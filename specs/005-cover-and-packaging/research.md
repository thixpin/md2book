# Research: Cover Rendering and npm Packaging

Measured 2026-09-29 on `development-book/book-01-dsa/cover/cover.html` (reference PNG 2008 × 2835).

## R-01 Rendering a cover page

- **Decision**: Chromium (Playwright, already a dependency). Load the HTML from a virtual origin
  whose root is the HTML's folder; inject the font set's `@font-face` rules first in `<head>`;
  wait for fonts; `page.pdf({ preferCSSPageSize: true })` gives the page count (must be 1). The
  exact page size comes from the page's `@page` rule (`CSSPageRule.style.size`, units mm/cm/in/
  pt/px/pc/Q and the named sizes A3–A5, B4–B5, letter, legal, ledger), falling back to the PDF's
  page size when there is none. Target pixels = round(size in pt × dpi / 72). Screenshot the
  page at `deviceScaleFactor = target width ÷ CSS width`, clipped to the page, then resize to
  the exact target with sharp.
- **Evidence**: Chromium rounds a 170 × 240 mm page to 481.92 × 679.92 pt (as in the PDF slice),
  so sizes read back from the PDF give 2008 × 2833; the `@page` size gives the reference's
  2008 × 2835. A screenshot at `dpi / 96` gave 2006 × 2831 (viewport rounding); scaling from the
  target width and a final resize give the exact size.
- **Alternatives**: rasterise the PDF with pdfjs (extra step, text rendering differs from
  Chromium's own); Paged.js (not needed for a single page).

## R-02 Fonts

- **Decision**: the set's faces are served at `/fonts/<file>` and declared under the set's
  `body_family` and `mono_family` with their weights and styles, so a cover that names the book's
  family ("Noto Sans Myanmar") gets the book's files. Author `@font-face` rules come later and win.

## R-03 Network

- **Decision**: every request is answered by `page.route`: paths inside the HTML's folder are
  served from disk; `data:` URLs need no request; anything else stops the command
  (`md2book: cover: unexpected request <url>`), like the PDF build.

## R-04 Package contents

- **Decision**: keep `"files": ["dist", "assets"]` (npm adds `package.json`, `README.md`,
  `LICENSE`). Build output excludes tests (tsconfig.build). A test runs `npm pack --dry-run
  --json` and compares the file list with an allow-list: `dist/**` (`.js`, `.d.ts`), the known
  asset files, and the three npm defaults. `prepublishOnly` runs `npm run check && npm run
  build`.

## R-05 Install check

- **Decision**: `scripts/package-check.ts` (npm script `package:check`): build, `npm pack` into a
  temp dir, `npm install <tarball>` in an empty project (the only network use: dependencies),
  then from that install and offline (`MD2BOOK_FONTS_SOURCE` → the repo's fixture fonts): `md2book
  --help` lists every command, `md2book init` succeeds, and `md2book build epub` builds
  `examples/demo-book` (copied into the temp dir).

## R-06 CI on pull requests and tags, publish on tags

- **Decision**: trigger `.github/workflows/ci.yml` on `pull_request` and `push: tags: ["v*"]`; jobs:
  `check` (npm ci, Chromium, epubcheck, `npm run check`), `browser` (Chromium + WebKit,
  `npm run test:e2e`), `release` (tags only, needs both; version check `v$(node -p
  "require('./package.json').version")` = tag; `npm run package:check`; `npm publish --access
  public` with npm trusted publishing (OIDC, no token; provenance automatic); `permissions: id-token: write,
  contents: read`).
- **Rationale**: author decision (tests on pull requests and tags, publish on tags only).

## R-07 Demo book

- **Decision**: `examples/demo-book/` = the demo book used during slices 2–4 (Burmese, "Python
  အခြေခံ"), extended to show every format (spec User Story 4): `book.json` with the common keys,
  3 chapters in 1 part, `code/` with snippet regions, `cover/cover.html` (rendered to
  `cover/cover.png` by `md2book cover`), an end image gated on chapter 3, and `README.md`
  explaining each file. Not in `files`, so not published. Prettier ignores it (manuscript).
