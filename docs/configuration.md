# Configuration

A book is described by one JSON file, `book.json` by convention.
`md2book init` writes a starting one with the required keys.

This example sets every key except the legacy `font_set`. Only `title`, `author`, `year`,
`identifier`, `output_name`, `cover` and `chapter_glob` are required;
leave out any other key to use its default, described in the tables
below.

```json
{
  "title": "Practical Python",
  "subtitle": "A hands-on guide for beginners",
  "author": "Aye Aye",
  "publisher": "Example Press",
  "year": "2026",
  "isbn": "978-0-00-000000-0",
  "language": "en",
  "identifier": "urn:uuid:0b0f6f7e-2f7a-4c1b-9d0e-5f2b3c4d5e6f",
  "output_name": "practical-python",

  "chapter_glob": "chapters/chapter-*.md",
  "part_glob": "chapters/part-*.md",
  "code_root": "code",

  "cover": "cover/cover.png",
  "back_cover": "cover/back.png",
  "favicon": "cover/favicon.svg",
  "end_image": "cover/end.png",
  "end_image_after": "chapter-12.md",

  "page": { "size": "a5" },
  "font": { "family": "noto-serif", "size": "s" },

  "recto_chapter_start": true,
  "running_headers": true,

  "web_published_chapters": ["chapter-01.md", "chapter-02.md"],
  "web_url": "https://book.example.com/",
  "description": "Learn Python by building small, useful programs.",

  "strings": {
    "chapter_label": "Chapter",
    "chapter_digits": "ascii",
    "contents_heading": "Contents",
    "page_names": {
      "cover": "Cover",
      "contents": "Contents",
      "back_cover": "Back cover"
    },
    "callout_titles": {
      "note": "Note",
      "warning": "Warning",
      "try": "Try it yourself"
    },
    "licence_text": "© 2026 Aye Aye. All rights reserved.",
    "typeface_line": "Typeface: Noto Serif",
    "storage_prefix": "practical-python"
  }
}
```

## Validation

The config is checked before any work:

- A missing required key, a wrong type or an unsupported value stops the
  command, naming the key (`md2book: /path/book.json: title: required key missing`).
- An unknown key prints a warning and is ignored.
- The `cover` file must exist, except for `md2book cover`, which
  creates it.
- Paths are relative to the config file.

The full JSON Schema is
[`specs/001-core-manuscript-pipeline/contracts/book-config.schema.json`](https://github.com/thixpin/md2book/blob/master/specs/001-core-manuscript-pipeline/contracts/book-config.schema.json).

## Book

| Key           | Required | Meaning                                                     |
| ------------- | -------- | ----------------------------------------------------------- |
| `title`       | yes      | book title                                                  |
| `subtitle`    | no       | on the PDF and EPUB title page and the web edition's header |
| `author`      | yes      | author name                                                 |
| `publisher`   | no       | publisher name                                              |
| `year`        | yes      | publication year, as a string                               |
| `isbn`        | no       | ISBN                                                        |
| `identifier`  | yes      | unique book id for the EPUB, e.g. `urn:uuid:…`              |
| `output_name` | yes      | base name of the built files (`<output_name>.epub`, …)      |
| `language`    | no       | `my` (default) or `en`                                      |

`language` picks the default [strings](#strings) and, with
`font.family`, the [fonts](#page-and-fonts).

A value that contains `PLACEHOLDER` in `title`, `subtitle`, `author`,
`publisher`, `year` or `isbn` is listed in the QA report as metadata to
fill before publication.

## Manuscript

| Key            | Required | Meaning                                                                             |
| -------------- | -------- | ----------------------------------------------------------------------------------- |
| `chapter_glob` | yes      | chapter files, e.g. `chapters/chapter-*.md`, read in name order                     |
| `part_glob`    | no       | part files that group chapters, e.g. `chapters/part-*.md`                           |
| `code_root`    | no       | folder that code includes are relative to (default: the nearest folder with `.git`) |

See [Writing chapters](writing.md).

## Images

| Key               | Required | Meaning                                                                       |
| ----------------- | -------- | ----------------------------------------------------------------------------- |
| `cover`           | yes      | cover image, PNG or JPEG                                                      |
| `back_cover`      | no       | web edition back cover; without it a plain one is generated                   |
| `favicon`         | no       | web edition icon, SVG                                                         |
| `end_image`       | no       | closing image after the last chapter                                          |
| `end_image_after` | no       | chapter file that must exist before `end_image` appears, e.g. `chapter-03.md` |

## Page and fonts

| Key           | Default                | Values                                   |
| ------------- | ---------------------- | ---------------------------------------- |
| `page.size`   | `default`              | PDF page size, see below                 |
| `font.family` | the language's default | the book's typeface, see below           |
| `font.size`   | `m`                    | PDF type size: `xs`, `s`, `m`, `l`, `xl` |

| `page.size` | Page (mm) | PDF file suffix |
| ----------- | --------- | --------------- |
| `default`   | 170 × 240 | `-170x240`      |
| `a5`        | 148 × 210 | `-148x210`      |
| `b5`        | 176 × 250 | `-176x250`      |
| `a4`        | 210 × 297 | `-210x297`      |
| `letter`    | 216 × 279 | `-216x279`      |

Margins and the front-matter spacing scale with the page, so every
size keeps the same proportions. `font.size` scales all the PDF's type
together — body, headings, code, tables, callouts, contents, headers
and page numbers — by 0.85 (`xs`), 0.92 (`s`), 1 (`m`), 1.1 (`l`) or
1.2 (`xl`). Page size and font size apply to the PDF only; the EPUB and
the web edition reflow and have their own text size.

| `font.family`           | Language | Typeface                    |
| ----------------------- | -------- | --------------------------- |
| `noto-sans-myanmar`     | `my`     | Noto Sans Myanmar (default) |
| `masterpiece-uni-round` | `my`     | Masterpiece Uni Round       |
| `padauk`                | `my`     | Padauk                      |
| `noto-serif-myanmar`    | `my`     | Noto Serif Myanmar          |
| `noto-sans`             | `en`     | Noto Sans (default)         |
| `noto-serif`            | `en`     | Noto Serif                  |

The family sets the typeface of every edition; code and terminal
blocks always use Noto Sans Mono. See [Fonts](fonts.md) for each
family's styles and licence.

The older `font_set` key (`sans` or `serif`) still works and picks the
Noto family of the book's language. Set either `font_set` or
`font.family`; if both are set they must name the same family.

## PDF

| Key                   | Default | Meaning                                  |
| --------------------- | ------- | ---------------------------------------- |
| `recto_chapter_start` | `false` | start every chapter on a right-hand page |
| `running_headers`     | `true`  | book and chapter titles in page headers  |

## Web edition

| Key                      | Meaning                                                                           |
| ------------------------ | --------------------------------------------------------------------------------- |
| `web_published_chapters` | chapter file names to publish, e.g. `["chapter-01.md"]`; required for `build web` |
| `web_url`                | the site's public URL, for canonical and share links                              |
| `description`            | the site's description (default: `subtitle`, then `title`)                        |

## Strings

`strings` overrides the words md2book puts on the page. Every key is
optional; the defaults follow `language`.

| Key                | `my` default                                                         | `en` default |
| ------------------ | -------------------------------------------------------------------- | ------------ |
| `chapter_label`    | `အခန်း`                                                              | `Chapter`    |
| `chapter_digits`   | `myanmar`                                                            | `ascii`      |
| `contents_heading` | `မာတိကာ`                                                             | `Contents`   |
| `page_names`       | `cover`: `Cover`, `contents`: `Contents`, `back_cover`: `Back cover` | same         |
| `callout_titles`   | `note`: `Note`, `warning`: `Warning`, `try`: `Try it yourself`       | same         |
| `licence_text`     | CC BY-NC-ND 4.0 notice                                               | same         |
| `typeface_line`    | `Typeface: <body font family>`                                       | same         |
| `storage_prefix`   | `devbook`                                                            | same         |

- `chapter_label` is the word chapter headings must start with, and
  `chapter_digits` how chapter and page numbers are written (`myanmar`
  digits ၁၂၃ or `ascii` 123).
- `licence_text` and `typeface_line` appear on the copyright page.
  `init` sets `licence_text` to an MIT notice.
- `storage_prefix` prefixes the keys the web reader saves in the
  browser (reading position, bookmarks, text size).

```json
"strings": {
  "contents_heading": "Table of Contents",
  "callout_titles": { "try": "Exercise" },
  "licence_text": "All rights reserved."
}
```
