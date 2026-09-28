# @thixpin/md2book

Turn a Markdown book manuscript into a print-ready PDF, an EPUB 3, a
web edition and a QA report, with first-class support for Myanmar
(Burmese) script. The CLI is `book-build`.

> **Status: early development.** This release contains the core
> manuscript pipeline (config, chapters, parts, code snippets, Markdown
> rendering, fonts) and the `init` and `fonts` commands. The `pdf`,
> `epub`, `qa`, `all`, `web`, `serve` and `cover` commands are reserved
> and print "not available yet". The package is not on npm yet, and
> the font download needs the `fonts-v1` release to be published.

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
$ book-build init my-book --lang en --font sans \
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
$ book-build fonts --config my-book/book.json
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

All sets use Noto Sans Mono (with Myanmar) for code. `book-build fonts`
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

| Key                         | Required | Notes                                      |
| --------------------------- | -------- | ------------------------------------------ |
| `title`, `author`, `year`   | yes      |                                            |
| `identifier`, `output_name` | yes      | `init` fills both                          |
| `cover`                     | yes      | PNG or JPEG; must exist                    |
| `chapter_glob`              | yes      | e.g. `chapters/chapter-*.md`               |
| `language`                  | no       | `my` (default) or `en`                     |
| `font_set`                  | no       | `sans` (default) or `serif`                |
| `part_glob`                 | no       | part files                                 |
| `code_root`                 | no       | default: nearest folder with `.git`        |
| `strings`                   | no       | series strings; defaults follow `language` |

## Programmatic API

The API mirrors the CLI:

```ts
import { init, fonts } from "@thixpin/md2book";

await init({ dir: "my-book", lang: "en", title: "T", author: "A" });
const { dir } = await fonts({ config: "my-book/book.json" });
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
