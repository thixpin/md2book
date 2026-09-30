# Commands

```console
$ md2book <command> [options]
$ md2book help <command>
```

| Command                     | What it does                                  |
| --------------------------- | --------------------------------------------- |
| [`init`](#init)             | create a new book project                     |
| [`fonts`](#fonts)           | fetch and verify the book's font set          |
| [`cover`](#cover)           | render a one-page HTML cover to PNG           |
| [`build pdf`](#build-pdf)   | build the 170 × 240 mm PDF                    |
| [`build epub`](#build-epub) | build the reflowable EPUB 3                   |
| [`build web`](#build-web)   | build the static web edition                  |
| [`serve`](#serve)           | build the web edition and preview it locally  |
| [`qa`](#qa)                 | write the QA report                           |
| [`build all`](#build-all)   | build every edition, then write the QA report |

## Common behaviour

- **Config.** Every command except `init` reads the book's config from
  `--config <path>`, which defaults to `book.json` in the current
  folder. Paths inside the config are relative to the config file.
- **Output folder.** Builds write to `dist/<config name>/` under the
  current folder, where `<config name>` is the config's file name
  without `.json` (`dist/book/` for `book.json`). `--out <dir>` picks
  another folder.
- **Fonts.** Commands that typeset text need the book's font set in the
  local cache; if it is missing they stop and print the `md2book fonts`
  command to run.
- **Errors.** A problem stops the command with one line naming the file
  or option and the reason, and exit code 1:

  ```console
  $ md2book build pdf
  md2book: /home/me/book.json: cannot read config file
  ```

## `init`

```console
$ md2book init [dir] [--lang <lang>] [--title <text>] [--author <text>]
    [--page-size <size>] [--font-family <id>] [--font-size <size>]
    [--chapters <folder>] [--font <set>]
```

Creates `book.json` and the first chapter in `dir` (default: the
current folder). It never overwrites existing files.

In a terminal, `init` first asks how to set the book up:

```text
? How would you like to configure your book?
❯ Use default configuration
  Configure with wizard
```

- **Use default configuration** asks only for the language, title and
  author, and uses the defaults for everything else.
- **Configure with wizard** also asks, one at a time, for the page
  size, font family, font size and chapter folder. Each is a list with
  the default pre-selected (↑/↓ or a digit, then Enter); only a custom
  chapter folder is typed.

Anything given as a flag is not asked. Outside a terminal (scripts, CI)
nothing is asked: `--lang`, `--title` and `--author` are required and
the rest default.

| Option                | Values                                                          | Default          |
| --------------------- | --------------------------------------------------------------- | ---------------- |
| `--lang <lang>`       | `my` (Myanmar; `mm` and `myanmar` accepted) or `en` (`english`) |                  |
| `--title <text>`      | book title                                                      |                  |
| `--author <text>`     | book author                                                     |                  |
| `--page-size <size>`  | `default` (170 × 240 mm), `a5`, `b5`, `a4`, `letter`            | `default`        |
| `--font-family <id>`  | a family of the book's language, e.g. `padauk`                  | language default |
| `--font-size <size>`  | `xs`, `s`, `m`, `l`, `xl`                                       | `m`              |
| `--chapters <folder>` | a folder inside `dir`                                           | `chapters`       |
| `--font <set>`        | `sans` or `serif`: the older way to pick the Noto family        |                  |

The new `book.json` gets a random `identifier`, an `output_name` made
from the title, `cover: "cover/cover.png"`, `chapter_glob:
"<folder>/chapter-*.md"`, and the chosen `page.size`, `font.family` and
`font.size` (see [Configuration](configuration.md#page-and-fonts)).

```console
$ md2book init my-book --lang my --title "ကျွန်ုပ်တို့ စာအုပ်" --author "Me" \
    --page-size a5 --font-family padauk --font-size s
```

## `fonts`

```console
$ md2book fonts [--config <path>] [--set <id>] [--fonts <dir>]
```

Downloads the book's font set, checks every file's SHA-256 and caches
it; prints the cache folder. Already-cached sets are not downloaded
again.

| Option            | Meaning                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| `--config <path>` | pick the set from the config's `language` and `font_set` (default `book.json`)                        |
| `--set <id>`      | pick a set by id instead: `my-sans`, `my-serif`, `my-padauk`, `my-masterpiece`, `en-sans`, `en-serif` |
| `--fonts <dir>`   | cache root (overrides `MD2BOOK_FONTS`)                                                                |

See [Fonts](fonts.md) for the cache location and offline mirrors.

## `cover`

```console
$ md2book cover <file> [-o <png>] [--dpi <n>] [--config <path> | --set <id>] [--fonts <dir>]
```

Renders a one-page HTML cover to a PNG with the book's fonts.

| Option               | Meaning                                                                          |
| -------------------- | -------------------------------------------------------------------------------- |
| `<file>`             | the cover HTML (required)                                                        |
| `-o, --output <png>` | PNG to write (default `cover.png` next to the HTML)                              |
| `--dpi <n>`          | resolution, 1–1200 (default 300)                                                 |
| `--config <path>`    | book config whose `language` and `font_set` pick the fonts (default `book.json`) |
| `--set <id>`         | font set instead of a config                                                     |
| `--fonts <dir>`      | font cache root (overrides `MD2BOOK_FONTS`)                                      |

Give either `--config` or `--set`, not both. The full guide is in
[Covers](cover.md).

## `build pdf`

```console
$ md2book build pdf [--config <path>] [--out <dir>] [--printed]
```

Builds the PDF at the book's `page.size` (170 × 240 mm by default):
`<out>/<output_name>-<size>.pdf`, for example `-170x240.pdf` or
`-148x210.pdf` for A5.

| Option            | Meaning                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `--config <path>` | book config (default `book.json`)                                                            |
| `--out <dir>`     | output folder (default `dist/<config name>/`)                                                |
| `--printed`       | the print-shop interior: no cover page, no colour; writes `<output_name>-<size>-printed.pdf` |

See [Editions: PDF](editions.md#pdf).

## `build epub`

```console
$ md2book build epub [--config <path>] [--out <dir>]
```

Builds the reflowable EPUB 3 of every chapter:
`<out>/<output_name>.epub`. See [Editions: EPUB](editions.md#epub).

## `build web`

```console
$ md2book build web [--config <path>] [--out <dir>]
```

Builds the static site of the chapters listed in
`web_published_chapters` to `<out>/web/`. See
[Editions: web edition](editions.md#web-edition).

## `serve`

```console
$ md2book serve [--config <path>] [--out <dir>] [--port <n>]
```

Builds the web edition, then serves it at `http://127.0.0.1:<port>/`
(default port 8000) until Ctrl+C. Unknown paths get the site's
`404.html`. A port already in use stops the command.

## `qa`

```console
$ md2book qa [--config <path>] [--out <dir>] [--printed]
```

Writes `<out>/QA-REPORT.md`. It checks the manuscript and fonts, and the
PDF and EPUB already in `<out>` when they exist; `--printed` checks the
printed PDF instead of the screen PDF. It never changes your files. See
[Editions: QA report](editions.md#qa-report).

## `build all`

```console
$ md2book build all [--config <path>] [--out <dir>] [--printed]
```

Runs `build pdf`, `build epub`, `build web` and `qa` in that order. The
web edition is skipped, with a note, when `web_published_chapters` is
not set. `--printed` builds and checks the printed PDF.
