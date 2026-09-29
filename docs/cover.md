# Covers

Design the cover as a one-page HTML file with CSS, then render it to a
PNG with the book's fonts, so Burmese text on the cover shapes exactly
like the book. Point `cover` in `book.json` at the PNG to use it as the
book's cover.

```console
$ md2book cover cover/cover.html
Cover written: /path/to/my-book/cover/cover.png (2008 x 2835 px, 300 dpi)
$ md2book cover cover/end.html -o cover/end.png --dpi 150
$ md2book cover design/cover.html --set my-sans
```

Run it from the book folder, or give `--config`. The config's cover
image does not have to exist yet, so the first cover can be rendered
from a new project.

| Option               | Meaning                                                                          |
| -------------------- | -------------------------------------------------------------------------------- |
| `<file>`             | the cover HTML (required)                                                        |
| `-o, --output <png>` | PNG to write (default `cover.png` next to the HTML)                              |
| `--dpi <n>`          | resolution, 1–1200 (default 300)                                                 |
| `--config <path>`    | book config whose `language` and `font_set` pick the fonts (default `book.json`) |
| `--set <id>`         | font set instead of a config: `my-sans`, `my-serif`, `en-sans`, `en-serif`       |
| `--fonts <dir>`      | font cache root (overrides `MD2BOOK_FONTS`)                                      |

Give either `--config` or `--set`, not both. The set must have been
fetched with `md2book fonts`, and the command needs Chromium
(`npx playwright install chromium`).

## Page size

The image size comes from the HTML's `@page { size: … }` rule and the
resolution: at 300 dpi a 170 × 240 mm page is 2008 × 2835 px, at 150 dpi
1004 × 1417 px. `size` takes two lengths (`mm`, `cm`, `in`, `pt`, `pc`,
`px`, `Q`), one length for a square, or a named size (`A5`, `A4`, `A3`,
`B5`, `B4`, `JIS-B5`, `JIS-B4`, `letter`, `legal`, `ledger`), optionally
with `landscape` or `portrait`. Without a `size` the page is US Letter.

The HTML must lay out as exactly one page; more or fewer stops the
command and writes nothing. Set `margin: 0` on `@page` and give `body`
the page's width and height with `overflow: hidden`.

## Fonts

The chosen set is available under the book's family names, in weights
400, 600 and 700, each with italics at 400 and 700:

| Set        | Text family          | Code family      |
| ---------- | -------------------- | ---------------- |
| `my-sans`  | `Noto Sans Myanmar`  | `Noto Sans Mono` |
| `my-serif` | `Noto Serif Myanmar` | `Noto Sans Mono` |
| `en-sans`  | `Noto Sans`          | `Noto Sans Mono` |
| `en-serif` | `Noto Serif`         | `Noto Sans Mono` |

Other font files (`.ttf`, `.otf`, `.woff`, `.woff2`) next to the HTML
can be loaded with your own `@font-face` rules.

## Images and other files

Relative URLs load files from the HTML's folder and its subfolders:
images (`.png`, `.jpg`, `.gif`, `.webp`, `.svg`), stylesheets, scripts
and fonts. Anything else, including files outside that folder and any
network URL, stops the command (`unexpected request …`), so a cover
always renders the same way, offline. The same HTML and fonts give the
same PNG bytes every time.

A minimal cover:

```html
<!doctype html>
<html lang="my">
  <head>
    <meta charset="utf-8" />
    <style>
      @page {
        size: 170mm 240mm;
        margin: 0;
      }
      html,
      body {
        margin: 0;
      }
      body {
        width: 170mm;
        height: 240mm;
        overflow: hidden;
        position: relative;
        background: #14213d url("art.png") center / cover;
        color: #f4f1ea;
        font-family: "Noto Sans Myanmar", sans-serif;
      }
      h1 {
        position: absolute;
        top: 60mm;
        left: 16mm;
        right: 16mm;
        font-size: 40pt;
      }
      p {
        position: absolute;
        bottom: 20mm;
        left: 16mm;
        font-size: 14pt;
      }
    </style>
  </head>
  <body>
    <h1>ကျွန်ုပ်တို့ စာအုပ်</h1>
    <p>Author Name</p>
  </body>
</html>
```

[`examples/demo-book/cover/`](https://github.com/thixpin/md2book/tree/master/examples/demo-book/cover) has a complete
cover and a closing illustration. All options are listed under
[`cover`](commands.md#cover) in the command reference.
