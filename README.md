# @thixpin/md2book

[![npm](https://img.shields.io/npm/v/@thixpin/md2book)](https://www.npmjs.com/package/@thixpin/md2book)
[![downloads](https://img.shields.io/npm/dw/@thixpin/md2book)](https://www.npmjs.com/package/@thixpin/md2book)
[![codecov](https://img.shields.io/codecov/c/github/thixpin/md2book?logo=codecov&label=codecov)](https://codecov.io/gh/thixpin/md2book)
[![License](https://img.shields.io/npm/l/@thixpin/md2book?label=License)](LICENSE)

Turn a Markdown book manuscript into a print-ready PDF, an EPUB 3, a
web edition and a QA report, with first-class support for Myanmar
(Burmese) script. The CLI is `md2book`.

> **Status: early development.** `init`, `fonts`, the PDF
> (`build pdf`), the EPUB (`build epub`), the web edition (`build web`,
> `serve`), the QA report (`qa`, `build all`) and `cover`.

A complete example book that uses every manuscript format is in
[`examples/demo-book`](examples/demo-book).

## Requirements

- Node.js 26 or newer.
- Chromium for the PDF, `cover` and the web edition's generated images.
  It is installed once in the setup step below.

## Install via npm

Install the CLI globally:

```console
$ npm install -g @thixpin/md2book
$ npx playwright install chromium
$ md2book --help
```

Or run it without installing:

```console
$ npx @thixpin/md2book --help
```

Or add it to a project and use the API:

```console
$ npm install @thixpin/md2book
$ npx playwright install chromium
```

`npx playwright install chromium` downloads the browser md2book renders
with (about 150 MB, once per machine). On Linux, use
`npx playwright install --with-deps chromium` to also install the system
libraries. Then fetch a book's fonts once with `md2book fonts` (see
[Fonts](#fonts)).

## Start a book

```console
$ md2book init my-book --lang en --font sans \
    --title "My Book" --author "Me"
```

In a terminal, `init` asks for anything you leave out. It writes
`book.json` and `chapters/chapter-01.md` and never overwrites files.

| Option                | Values                                              |
| --------------------- | --------------------------------------------------- |
| `--lang`              | `my` (Myanmar; `mm` and `myanmar` accepted) or `en` |
| `--font`              | `sans` (default) or `serif`                         |
| `--title`, `--author` | text; required outside a terminal                   |

Add a cover image at `cover/cover.png`, then fetch the fonts:

```console
$ md2book fonts --config my-book/book.json
```

## PDF

```console
$ md2book build pdf --config my-book/book.json
$ md2book build pdf --config my-book/book.json --printed
```

`build pdf` writes the 170 × 240 mm book to
`dist/<config name>/<output_name>-170x240.pdf`: cover, title page,
copyright page, contents with page numbers, then the chapters, with
running headers and page numbers. Page 1 is the first page of chapter
one; Myanmar books number pages in Myanmar digits. Chapters start on a
right-hand page with `recto_chapter_start: true`; `running_headers:
false` removes the headers.

`--printed` writes the print-shop interior,
`<output_name>-170x240-printed.pdf`: no cover page (the title page is
page 1) and no colour, so it prints cleanly in black and white. The
print document is kept in `src/book-print.html` (or
`src/book-printed.html`) for checking.

## EPUB and QA report

```console
$ md2book build epub --config my-book/book.json
$ md2book qa --config my-book/book.json
$ md2book build all --config my-book/book.json
```

`epub` writes a reflowable EPUB 3 of every chapter to
`dist/<config name>/<output_name>.epub` (the unpacked files stay in
`src/epub/`). `qa` writes `QA-REPORT.md`: manuscript counts, Unicode and
Burmese text checks, typeface coverage, and PDF and EPUB checks when
those exist. The PDF checks write sample pages to `qa-pages/`; add
`--printed` to check the printed edition. QA reports problems and never
changes your files. With
[epubcheck](https://www.w3.org/publishing/epubcheck/) on your PATH, the
report includes its result. `build all` runs `build pdf`, `build epub`,
`build web` (skipped with a note when `web_published_chapters` is not
set) and `qa`; `build all --printed` builds and checks the printed PDF.

An `end_image` shows after the last chapter (the PDF's last page, the
EPUB's last document) only once the chapter named by `end_image_after`
exists.

## Web edition

Publish chosen chapters as a static site that reads like a real book:
it opens from a closed cover, pages turn with a curled sheet, and wide
screens show a two-page spread. List the public chapters in the config;
other chapter files are never read:

```json
"web_published_chapters": ["chapter-01.md", "chapter-02.md"]
```

```console
$ md2book build web --config my-book/book.json
$ md2book serve --config my-book/book.json --port 8000
```

Readers can change the text size with the "Aa" button or the `+` and
`-` keys; titles and body text scale, code blocks keep their size.

The site is written to `dist/<config name>/web/` (or `--out <dir>`) and
must be served from the root of its domain. Set `web_url` for canonical
and share links. `favicon` (an SVG) and `back_cover` are optional; without
`back_cover` a plain one is generated, which needs Chromium once:

```console
$ npx playwright install chromium
```

## Cover

Design the cover as a one-page HTML file with CSS and render it to PNG
with the book's fonts, so Burmese text on the cover shapes like the
book:

```console
$ md2book cover cover/cover.html --config my-book/book.json
$ md2book cover cover/end.html -o cover/end.png --dpi 150 --set my-sans
```

The page size comes from the HTML's `@page { size: … }` rule; at the
default 300 dpi a 170 × 240 mm page is 2008 × 2835 px. The PNG goes next
to the HTML as `cover.png` unless `-o` says otherwise. Images and styles
next to the HTML load; nothing loads from the network. More or fewer
than one page stops the command. The font set comes from `--config` (the
book's language and font set) or `--set` (default `my-sans`) and must
have been fetched with `md2book fonts`.

## Fonts

Four curated font sets, each with regular, semibold, bold, italic and
bold italic body faces plus regular and bold monospace faces:

| Set        | Body family        | Covers          |
| ---------- | ------------------ | --------------- |
| `my-sans`  | Noto Sans Myanmar  | Myanmar + Latin |
| `my-serif` | Noto Serif Myanmar | Myanmar + Latin |
| `en-sans`  | Noto Sans          | Latin           |
| `en-serif` | Noto Serif         | Latin           |

All sets use Noto Sans Mono (with Myanmar) for code. `md2book fonts`
downloads the set once, checks every file's SHA-256 against the
manifest shipped in the package, and caches it. After that, everything
works offline.

| Option or variable     | Meaning                                                |
| ---------------------- | ------------------------------------------------------ |
| `--config <path>`      | pick the set from the book's `language` and `font_set` |
| `--set <id>`           | pick a set by id instead                               |
| `--fonts <dir>`        | cache root                                             |
| `MD2BOOK_FONTS`        | cache root (default `~/.cache/md2book/fonts`)          |
| `MD2BOOK_FONTS_SOURCE` | mirror URL or local folder with the same files         |

## Writing chapters

Each chapter is one Markdown file matched by `chapter_glob`, ordered by
file name. The first line is the chapter heading:

```markdown
# အခန်း (၁) - Title (Myanmar books)

# Chapter 1 - Title (English books)
```

Optional part files (`part_glob`) group chapters in the contents list:

```markdown
# Part I - Basics

chapters: 1-3
```

Include tested code instead of pasting it. The path is relative to
`code_root`:

```markdown
<!-- include: src/order.ts -->
<!-- include: src/order.ts#total -->
```

A region is marked in the source with `// #region total` and
`// #endregion` (or `#` comments).

Supported Markdown extras: syntax-highlighted code, `console` terminal
blocks (`$ ` lines are commands), pipe tables, callouts (`> [!NOTE]`,
`> [!WARNING]`, `> [!TRY]`) and `---` scene breaks.

## Configuration

`book.json` is validated before any work. Unknown keys produce a
warning; wrong types stop the run. Paths are relative to the config
file. The full schema is in
[`specs/001-core-manuscript-pipeline/contracts/book-config.schema.json`](specs/001-core-manuscript-pipeline/contracts/book-config.schema.json).

| Key                                               | Required | Notes                                      |
| ------------------------------------------------- | -------- | ------------------------------------------ |
| `title`, `author`, `year`                         | yes      |                                            |
| `identifier`, `output_name`                       | yes      | `init` fills both                          |
| `cover`                                           | yes      | PNG or JPEG; must exist                    |
| `chapter_glob`                                    | yes      | e.g. `chapters/chapter-*.md`               |
| `recto_chapter_start`, `running_headers`          | no       | PDF: right-hand chapter starts, headers    |
| `language`                                        | no       | `my` (default) or `en`                     |
| `font_set`                                        | no       | `sans` (default) or `serif`                |
| `part_glob`                                       | no       | part files                                 |
| `code_root`                                       | no       | default: nearest folder with `.git`        |
| `strings`                                         | no       | series strings; defaults follow `language` |
| `web_published_chapters`                          | for web  | chapter file names to publish              |
| `web_url`, `favicon`, `back_cover`, `description` | no       | web edition                                |
| `end_image`, `end_image_after`                    | no       | closing image and its gate chapter         |

## Programmatic API

The API mirrors the CLI:

```ts
import { all, cover, fonts, init, pdf, web } from "@thixpin/md2book";

await init({ dir: "my-book", lang: "en", title: "T", author: "A" });
await fonts({ config: "my-book/book.json" });
const { dir } = await web({ config: "my-book/book.json" });
const { file } = await pdf({ config: "my-book/book.json", printed: true });
const { report } = await all({ config: "my-book/book.json" });
await cover({ html: "my-book/cover/cover.html", config: "my-book/book.json" });
```

## Development

To work on md2book itself, install it from a clone:

```console
$ git clone https://github.com/thixpin/md2book.git
$ cd md2book
$ nvm use
$ npm install
$ npx playwright install chromium
$ npm run build
$ npm link
$ npm run check
```

`check` runs the type checker, ESLint, Prettier and the tests. Tests
never use the network. `npm run coverage` runs the tests with coverage
thresholds, `npm run test:e2e` the browser tests and
`npm run package:check` installs the packed tarball into an empty
project and runs the CLI from it. Design notes live in `specs/` and deliberate
differences from the original Python toolchain in
[`docs/decision-log.md`](docs/decision-log.md).

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) to report a bug or send a change, and
[SECURITY.md](SECURITY.md) to report a vulnerability privately.

## Licence

MIT for the package. The fonts are licensed under the SIL Open Font
License 1.1; `LICENSE-OFL.txt` is installed next to them. The small
test fonts in `test/fixtures/fonts-source/` are OFL subsets of the same
Noto fonts and carry the same licence file.
