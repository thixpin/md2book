# Usage examples

Recipes for common jobs. Each one runs from the book's folder, where
`book.json` is, unless it says otherwise.

## An English book from scratch

```console
$ md2book init my-book --lang en --title "Practical Python" --author "Aye Aye"
$ cd my-book
$ mkdir cover && cp ~/cover.png cover/cover.png   # or design one: see Covers
$ md2book fonts
$ md2book build all
```

`dist/book/` now holds `practical-python-170x240.pdf`,
`practical-python.epub` and `QA-REPORT.md`.

## A Myanmar book in serif type

```console
$ md2book init my-book --lang my --font serif --title "ကျွန်ုပ်တို့ စာအုပ်" --author "အောင်အောင်"
```

Chapter headings then take the form `# အခန်း (၁) - Title`, pages are
numbered in Myanmar digits and the contents heading is `မာတိကာ`. See
[Writing chapters](writing.md).

## The print-shop PDF

```console
$ md2book build pdf --printed
$ md2book qa --printed
```

`<output_name>-170x240-printed.pdf` has no cover page and no colour, for
a black-and-white interior; the printer takes the cover separately.
Render the cover at print resolution:

```console
$ md2book cover cover/cover.html --dpi 300
```

For a book that opens every chapter on a right-hand page, set
`"recto_chapter_start": true` in `book.json` first.

## Publish the web edition

List the chapters to publish, and the site's address:

```json
"web_published_chapters": ["chapter-01.md", "chapter-02.md"],
"web_url": "https://book.example.com/"
```

```console
$ md2book serve               # check it at http://127.0.0.1:8000/
$ md2book build web
```

Upload the contents of `dist/book/web/` to the root of the domain on
any static host. The site must be served from the root, so a host that
puts it under a sub-path (such as `https://user.github.io/repo/`) needs
a custom domain.

## Several editions from one manuscript

The output folder is named after the config file, so a second config
builds a separate edition side by side. For example, a
`sample.json` that is a copy of `book.json` with a different
`output_name` and only the first chapters in its `chapter_glob`:

```json
"output_name": "my-book-sample",
"chapter_glob": "chapters/chapter-0[12].md"
```

```console
$ md2book build all                        # dist/book/
$ md2book build all --config sample.json   # dist/sample/
```

## Include tested code

Keep the book's code in files that your tests run, point `code_root`
at their folder, and include them:

```json
"code_root": "code"
```

```markdown
<!-- include: hello.py -->
<!-- include: orders.ts#total -->
```

A missing file or region stops the build, so the book never shows code
that no longer exists. See [Code from files](writing.md#code-from-files).

## Change the words on the page

```json
"strings": {
  "contents_heading": "Table of Contents",
  "callout_titles": { "try": "Exercise" },
  "licence_text": "© 2026 Aye Aye. All rights reserved."
}
```

See [Strings](configuration.md#strings) for every key.

## Build in CI

A GitHub Actions job that builds every edition and keeps the fonts
between runs:

```yaml
jobs:
  book:
    runs-on: ubuntu-latest
    env:
      MD2BOOK_FONTS: ${{ github.workspace }}/.fonts
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 26
      - run: npm install -g @thixpin/md2book
      - run: npx playwright install --with-deps chromium
      - uses: actions/cache@v4
        with:
          path: .fonts
          key: md2book-fonts-${{ hashFiles('book.json') }}
      - run: md2book fonts
      - run: md2book build all
      - uses: actions/upload-artifact@v4
        with:
          name: book
          path: dist/book/
```

`md2book fonts` verifies cached files and downloads only what is
missing, so a stale cache is harmless.

## Work offline

On a machine with internet access, fetch the sets into a folder you can
carry:

```console
$ MD2BOOK_FONTS=/media/usb/md2book-fonts md2book fonts --set my-sans
```

On the offline machine, point the cache at it:

```console
$ export MD2BOOK_FONTS=/media/usb/md2book-fonts
$ md2book build all
```

Chromium must also be installed there; see
[Getting started](getting-started.md#install).

## A build script

```ts
import { all, cover } from "@thixpin/md2book";

await cover({ html: "cover/cover.html", config: "book.json" });
const { pdf, epub, report } = await all({ config: "book.json" });
console.log(pdf, epub, report);
```

See the [Programmatic API](api.md).
