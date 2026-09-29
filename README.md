# @thixpin/md2book

Turn a Markdown book manuscript into a print-ready PDF, an EPUB 3, a
web edition and a QA report, with first-class support for Myanmar
(Burmese) script. The CLI is `md2book`.

> **Status: early development.** This release contains the core
> manuscript pipeline, `init` and `fonts`, the web edition (`web`,
> `serve`), the EPUB (`epub`) and the QA report (`qa`, `all`). The `pdf`
> and `cover` commands are reserved and print "not available yet". The
> package is not on npm yet.

## Requirements

- Node.js 26 or newer (`.nvmrc` says `26`).

## Install from a clone

```console
$ nvm use
$ npm install
$ npm run build
$ npm link
```

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

## EPUB and QA report

```console
$ md2book epub --config my-book/book.json
$ md2book qa --config my-book/book.json
$ md2book all --config my-book/book.json
```

`epub` writes a reflowable EPUB 3 of every chapter to
`dist/<config name>/<output_name>.epub` (the unpacked files stay in
`src/epub/`). `qa` writes `QA-REPORT.md`: manuscript counts, Unicode and
Burmese text checks, typeface coverage, and EPUB checks when the EPUB
exists. It reports problems and never changes your files. With
[epubcheck](https://www.w3.org/publishing/epubcheck/) on your PATH, the
report includes its result. `all` runs `epub`, then `qa`.

An `end_image` shows after the last chapter only once the chapter named
by `end_image_after` exists.

## Web edition

Publish chosen chapters as a static site that reads like a real book:
it opens from a closed cover, pages turn with a curled sheet, and wide
screens show a two-page spread. List the public chapters in the config;
other chapter files are never read:

```json
"web_published_chapters": ["chapter-01.md", "chapter-02.md"]
```

```console
$ md2book web --config my-book/book.json
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
import { all, fonts, init, web } from "@thixpin/md2book";

await init({ dir: "my-book", lang: "en", title: "T", author: "A" });
await fonts({ config: "my-book/book.json" });
const { dir } = await web({ config: "my-book/book.json" });
const { epub, report } = await all({ config: "my-book/book.json" });
```

## Development

```console
$ npm run check
```

`check` runs the type checker, ESLint, Prettier and the tests. Tests
never use the network. Design notes live in `specs/` and deliberate
differences from the original Python toolchain in
[`docs/decision-log.md`](docs/decision-log.md).

## Licence

MIT for the package. The fonts are licensed under the SIL Open Font
License 1.1; `LICENSE-OFL.txt` is installed next to them. The small
test fonts in `test/fixtures/fonts-source/` are OFL subsets of the same
Noto fonts and carry the same licence file.
