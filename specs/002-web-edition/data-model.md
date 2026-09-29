# Data Model: Web Edition

Builds on feature 001's `BookConfig`, `Chapter` and `FontSet`.

## WebChapter (a `Chapter` loaded from the allow-list)

| Field | Rule |
|---|---|
| `index` | the chapter **number** (not the position) |
| `slug` | `ch` + two-digit number, e.g. `ch07` |
| `href` | `/chapters/{slug}.html` |
| `shortTitle` | the heading title |
| `description` | first paragraph, cut per research R-08; fallback = book description |

Validation of `web_published_chapters` (spec US-1 #3), in order, each a `BookError` naming the key
or entry: not a non-empty list of strings → `web_published_chapters`; entry not a plain `.md`
file name inside the chapter directory; entry not found; duplicate entry; duplicate chapter
number.

## CoverFacts

| Field | Rule |
|---|---|
| `ratio` | cover width / height, written with 5 decimals |
| `edge` | average RGB of edge samples (research R-03), written as `rgb(R G B)` with rounded values |

## BookKey

`{strings.storage_prefix}:{basename(out dir)}:{sha256(chapters.map(expandedMd).join(""))[:10]}`;
reader storage keys `{bookKey}:position` (`{page, pageCount}`) and `{bookKey}:bookmarks` (list).

## WebAssets

| Asset | Name |
|---|---|
| stylesheet | `style.{sha256(css)[:12]}.css`, css = `common.css + "\n" + web.css` (font-set substituted, R-02) |
| reader | `reader.{sha256(script)[:12]}.js` |
| cover | `cover{ext}` (original extension) |
| back cover | `back-cover{ext}` (copied) or `back-cover.png` (generated) |
| share image | `og-image.png`, 1200 × 630 |
| favicons | `favicon.svg`, `favicon-32.png` (32), `apple-touch-icon.png` (180) — copied from `favicon`, or the generated default (open book on the cover edge colour) |
| fonts | `fonts/` = every file of the configured font set + `LICENSE-OFL.txt` |

## Reference constants (from `development-book/publish/web.py`, `d235dbd`)

- Description limit 155 code points; trailing strip set ` ,.;:–-`; ellipsis `…`.
- Back cover: width 850 px; title 26 px bold, box x 14–86 %, y 8–20 %; author 18 px regular,
  y 88–95 %; colour 0.96/0.95/0.92.
- Share image 1200 × 630; `og:image:alt` = `{title} cover`.
- Page titles: index `{title}`; chapter `{title} | {chapter title}`; 404 `{title} | Page not found`.
- 404 body: `<h1>Page not found</h1><p><a href="/">Open the book</a></p>`.
- Panel strings (English, unchanged): Contents, Bookmarks, No bookmarks yet., Search this book,
  Word or phrase, Previous, Next.
- Lucide icons (ISC): list, search, bookmark, bookmark-check, maximize-2, minimize-2,
  chevron-left, chevron-right — paths copied verbatim from `ICON_PATHS`.
- Reader constants: see spec FR-020 and REF §10 (unchanged in the carried script).
