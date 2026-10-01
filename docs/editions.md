# Editions

Every build writes to `dist/<config name>/` under the current folder
(`dist/book/` for `book.json`), or to `--out <dir>`:

| File                               | Built by                        |
| ---------------------------------- | ------------------------------- |
| `<output_name>-<size>.pdf`         | `build pdf`                     |
| `<output_name>-<size>-printed.pdf` | `build pdf --printed`           |
| `<output_name>.epub`               | `build epub`                    |
| `web/`                             | `build web`, `serve`            |
| `QA-REPORT.md`, `qa-pages/`        | `qa`                            |
| `src/`                             | working files kept for checking |

## PDF

```console
$ md2book build pdf
$ md2book build pdf --printed
```

The book at its page size — 170 × 240 mm unless
[`page.size`](configuration.md#page-and-fonts) says A5, B5, A4 or
Letter — in this order: cover, title page, copyright page, contents
with page numbers, then the chapters, with running headers and page
numbers. `<size>` in the file name is the page in millimetres
(`170x240`, `148x210`, …). [`font.size`](configuration.md#page-and-fonts)
makes all the type smaller or larger together.

- Page 1 is the first page of chapter one. Myanmar books number pages
  in Myanmar digits (`chapter_digits`).
- `recto_chapter_start: true` starts every chapter on a right-hand page.
- The running heads and feet (author, book and chapter titles, page
  number) follow the book's [`running`](configuration.md#running-heads-and-feet)
  layout, mirrored on left and right pages.
- Burmese lines break between syllables, never inside one.
- A section heading never sits alone at the foot of a page; it moves to
  the next page with its first lines.
- An `end_image` becomes the last page once the chapter named by
  `end_image_after` exists.

**Printed edition.** `--printed` writes the print-shop interior,
`<output_name>-<size>-printed.pdf`: no cover page (the title page is
page 1), no colour and no dark fills, so code and terminal blocks print
cleanly in black and white.

The HTML the PDF is typeset from is kept in `src/book-print.html` (or
`src/book-printed.html`) for checking.

## EPUB

```console
$ md2book build epub
```

A reflowable EPUB 3 of every chapter, `<output_name>.epub`, with the
book's fonts embedded, the cover, a title and copyright page, and the
contents. An `end_image` is the last document once the chapter named by
`end_image_after` exists. The unpacked files stay in `src/epub/`.

## Web edition

```console
$ md2book build web
$ md2book serve --port 8000
```

A static site of the chapters listed in `web_published_chapters`; other
chapter files are never read, so unpublished drafts never reach the
site. It reads like a real book: it opens from a closed cover, pages
turn with a curled sheet, and wide screens show a two-page spread.

Each page carries the same running head and foot as the PDF, set by
[`running`](configuration.md#running-heads-and-feet).

The site loads nothing from other servers unless the book opts into
[analytics](analytics.md) (Google Analytics, Plausible,
GoatCounter or Cloudflare Web Analytics).

Readers get a toolbar with the contents, search, text size, bookmarks
and fullscreen, and these keys:

| Key     | Action                                                |
| ------- | ----------------------------------------------------- |
| `←` `→` | previous and next page                                |
| `+` `-` | larger and smaller text (code blocks keep their size) |
| `F`     | fullscreen                                            |

On phones and tablets, a page turns with a swipe left or right anywhere
on the book (a slanted thumb swipe counts, and a short flick is
enough), or with a tap near the left or right edge of the page, on the
text too. The middle of the page, links, buttons and code blocks keep
their own taps, text can still be selected, and a pinch-zoomed page
pans instead of turning. Turns are a little quicker there than with a
mouse. With a mouse or trackpad, the arrows, the page edges and the
keys turn the pages as before.

The reading position, bookmarks and text size are remembered in the
browser.

The site is written to `web/`: `index.html`, one page per chapter in
`chapters/`, `404.html`, `robots.txt`, `sitemap.xml` (with `web_url`),
and its styles, fonts and images. Upload the folder as it is; it is
served from the root of its domain, or from the path of `web_url`
(like a GitHub project site). To publish it on GitHub Pages, see
[GitHub Pages](github-pages.md).

For search engines, every page names md2book as its generator
(`<meta name="generator" content="md2book">`), `robots.txt` lets
crawlers read the whole site, and `sitemap.xml` lists the home page and
every published chapter by its absolute URL; the 404 page is marked
`noindex` and is not listed. A sitemap needs the site's address, so
without `web_url` it is not written and `robots.txt` does not name it.

| Key               | Effect                                                            |
| ----------------- | ----------------------------------------------------------------- |
| `web_url`         | canonical and share links, the sitemap and the site's path        |
| `web_description` | the page description (default `subtitle`, then `title`)           |
| `web_favicon`     | an SVG icon                                                       |
| `web_back_cover`  | the back cover; without it a plain one is generated with Chromium |

`serve` builds the site, then serves it at `http://127.0.0.1:8000/`
(`--port` changes the port) until Ctrl+C.

## QA report

```console
$ md2book qa
$ md2book qa --printed
```

`QA-REPORT.md` is a checklist to read before publishing. `qa` reports
problems and never changes your files. It covers:

- **Manuscript:** chapter count and order, code includes, word and
  character counts, and a table of chapters with their sections.
- **Unicode and Burmese text:** text that is not NFC-normalized,
  replacement characters, zero-width and no-break spaces, BOMs, control
  characters, doubled vowel or medial signs, doubled punctuation, a
  space before `။` or `၊`, double spaces, repeated words and HTML tags,
  with file and line.
- **Typeface coverage:** which characters each font draws, and any
  character none of the book's fonts cover.
- **PDF** (when built): page facts and checks, with sample pages
  rendered to `qa-pages/`. `--printed` checks the printed PDF.
- **EPUB** (when built): reflowable layout, embedded fonts, chapter
  text identical to the manuscript, structure, and the
  [epubcheck](https://www.w3.org/publishing/epubcheck/) result when it
  is on your `PATH`.
- **Metadata placeholders:** book fields that still contain
  `PLACEHOLDER`.
- **Known layout limitations** and a section for your own review notes.

`qa` checks the PDF and EPUB already in the output folder; run the
builds first, or use `build all`, which builds everything and then
writes the report.
