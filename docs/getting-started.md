# Getting started

This guide installs md2book and builds a small book in every edition.

## Requirements

- Node.js 26 or newer.
- Chromium, which md2book uses for the PDF, `cover` and the web
  edition's generated images. Playwright installs it once per machine
  (about 150 MB).
- Optional: [epubcheck](https://www.w3.org/publishing/epubcheck/) on
  your `PATH`, so the QA report includes its result.

## Install

```console
$ npm install -g @thixpin/md2book
$ npx playwright install chromium
$ md2book --help
```

On Linux, run `npx playwright install --with-deps chromium` to install
the system libraries as well. To try md2book without installing it,
prefix any command with `npx @thixpin/md2book` instead of `md2book`.

## 1. Create the book

```console
$ md2book init my-book --lang en --title "My Book" --author "Me"
created my-book/book.json
created my-book/chapters/chapter-01.md
$ cd my-book
```

Run just `md2book init my-book` in a terminal and it asks how to set
the book up: **Use default configuration** asks only for the language,
title and author; **Configure with wizard** also lets you pick the page
size (A5, B5, A4, Letter), the font family (for Myanmar books Noto Sans
Myanmar, Masterpiece Uni Round or Padauk), the font size and the chapter
folder. Every choice is also a flag (see
[`init`](commands.md#init)), and `init` never overwrites files.

Every other command reads `book.json` from the current folder, so the
rest of this guide runs inside `my-book/`.

## 2. Add a cover

The builds need the cover image named by `cover` in `book.json`
(`cover/cover.png` by default). Use an existing PNG or JPEG, or design
one in HTML and render it with the book's fonts (see
[Covers](cover.md)):

```console
$ md2book cover cover/cover.html
```

## 3. Fetch the fonts

```console
$ md2book fonts
```

This downloads the book's font set once and verifies every file. After
that, everything works offline. See [Fonts](fonts.md).

## 4. Write

Chapters live in `chapters/`, one file per chapter, and each starts with
its chapter heading:

```markdown
# Chapter 1 - Getting Started

Write your first chapter here.
```

Add `chapters/chapter-02.md` and so on; files are read in name order.
See [Writing chapters](writing.md) for parts and code includes, and
[Markdown syntax](markdown.md) for everything a chapter can contain.

## 5. Build

```console
$ md2book build all
```

This writes the PDF, the EPUB and the QA report to `dist/book/`. To
also build the web edition, list the public chapters in `book.json`:

```json
"web_published_chapters": ["chapter-01.md"]
```

Then preview it:

```console
$ md2book serve
Serving http://127.0.0.1:8000/ (Ctrl+C to stop)
```

## Project layout

| Path                     | What it is                                          |
| ------------------------ | --------------------------------------------------- |
| `book.json`              | the book's [configuration](configuration.md)        |
| `chapters/chapter-01.md` | chapters, matched by `chapter_glob`                 |
| `cover/cover.png`        | the cover image                                     |
| `dist/book/`             | everything md2book builds ([Editions](editions.md)) |

## Next steps

- Read [`QA-REPORT.md`](editions.md#qa-report) in `dist/book/` before
  publishing.
- Build the print-shop interior with `md2book build pdf --printed`.
- Browse the [usage examples](examples.md) and the
  [demo book](https://github.com/thixpin/md2book/tree/master/examples/demo-book).
