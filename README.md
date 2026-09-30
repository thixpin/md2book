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

## See it in action

See how md2book turns a Markdown manuscript into a real Burmese tech book.

[![md2book in 40 seconds: from Markdown to a real Burmese tech book](https://img.youtube.com/vi/UpmgagatMpc/maxresdefault.jpg)](https://www.youtube.com/watch?v=UpmgagatMpc)

## Features

- **PDF:** a 170 × 240 mm, A5, B5, A4 or Letter book in five type
  sizes, with cover, title and copyright pages, contents with page
  numbers, running headers, and a black-and-white print-shop edition.
- **EPUB 3:** reflowable, with the book's fonts embedded.
- **Web edition:** a static site that reads like a real book, with page
  turns, two-page spreads, search, bookmarks and adjustable text size.
- **QA report:** manuscript, Unicode and Burmese text, typeface
  coverage, PDF and EPUB checks, without changing your files.
- **Covers:** designed in HTML and CSS, rendered to PNG with the book's
  fonts.
- **Myanmar script:** Burmese headings and page numbers, syllable-based
  line breaking and curated fonts (Noto, Padauk, Masterpiece Uni Round),
  verified and cached for offline
  use.
- **Tested code:** chapters include code from source files, whole or by
  region.

## Requirements

- Node.js 26 or newer.
- Chromium, installed once with Playwright (below).

## Install

```console
$ npm install -g @thixpin/md2book
$ npx playwright install chromium
```

On Linux, use `npx playwright install --with-deps chromium`. To run
without installing, use `npx @thixpin/md2book` in place of `md2book`.

## Quick start

```console
$ md2book init my-book --lang en --title "My Book" --author "Me"
$ cd my-book
$ mkdir cover && cp ~/my-cover.png cover/cover.png   # or render one: docs/cover.md
$ md2book fonts
$ md2book build all
```

Every command reads `book.json` from the current folder (or
`--config <path>`) and writes to `dist/book/`. See
[Getting started](docs/getting-started.md) for the full walkthrough and
[`examples/demo-book`](examples/demo-book) for a complete Burmese book.

| Command                         | What it does                              |
| ------------------------------- | ----------------------------------------- |
| `md2book init [dir]`            | create `book.json` and a first chapter    |
| `md2book fonts`                 | fetch and verify the book's fonts         |
| `md2book cover <file>`          | render an HTML cover to PNG               |
| `md2book build pdf [--printed]` | build the PDF, or the print-shop interior |
| `md2book build epub`            | build the EPUB 3                          |
| `md2book build web`             | build the web edition                     |
| `md2book serve [--port <n>]`    | build and preview the web edition         |
| `md2book qa [--printed]`        | write `QA-REPORT.md`                      |
| `md2book build all [--printed]` | all of the above, then the QA report      |
| `md2book deploy github-pages`   | set up GitHub Pages publishing (web)      |

## Documentation

The full documentation is on the website,
**[md2book.thixpin.me](https://md2book.thixpin.me/)**, and
in [`docs/`](docs/README.md):

- [Getting started](docs/getting-started.md)
- [Writing chapters](docs/writing.md): headings, parts, code includes
- [Markdown syntax](docs/markdown.md): supported and unsupported syntax
- [Covers](docs/cover.md)
- [Usage examples](docs/examples.md)
- [Analytics](docs/analytics.md): opt-in page-view analytics for the web edition
- [GitHub Pages](docs/github-pages.md): publish the web edition with GitHub Actions
- [Commands](docs/commands.md): every command and option
- [Configuration](docs/configuration.md): every `book.json` key
- [Editions](docs/editions.md): the PDF, EPUB, web edition and QA report
- [Fonts](docs/fonts.md): font sets, cache and offline use
- [Programmatic API](docs/api.md)

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
thresholds, `npm run test:e2e` the browser tests, `npm run test:perf`
the slow performance and load tests (on demand only) and
`npm run package:check` installs the packed tarball into an empty
project and runs the CLI from it. `npm run docs:dev` previews the
documentation site and `npm run docs:build` builds it. Design notes live in `specs/` and deliberate
differences from the original Python toolchain in
[`specs/decision-log.md`](specs/decision-log.md).

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) to report a bug or send a change, and
[SECURITY.md](SECURITY.md) to report a vulnerability privately.

## Licence

MIT for the package. The fonts are licensed under the SIL Open Font
License 1.1; `LICENSE-OFL.txt` is installed next to them. The small
test fonts in `test/fixtures/fonts-source/` are OFL subsets of the same
Noto fonts and carry the same licence file.
