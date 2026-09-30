# CLI contract: presets and the guided init (spec 006)

Changes to the contracts in `specs/001-core-manuscript-pipeline/contracts/cli.md`,
`specs/004-pdf-editions` and `specs/005-cover-and-packaging/contracts/cli.md`. Everything not
listed here is unchanged. Global error rule unchanged: exit 1 with one line
`md2book: <file|key|flag>: <reason>`.

## `md2book init [dir]`

| Option                  | Values                                                          | Default               |
| ----------------------- | --------------------------------------------------------------- | --------------------- |
| `--lang <lang>`         | `my`, `mm`, `myanmar`, `en`, `english`                          | required              |
| `--title <text>`        | string                                                          | required              |
| `--author <text>`       | string                                                          | required              |
| `--page-size <size>`    | `default`, `a5`, `b5`, `a4`, `letter`                           | `default`             |
| `--font-family <id>`    | a family id of the book's language (data-model.md)             | language default      |
| `--font <set>`          | `sans`, `serif` (legacy; maps to the Noto family)               | —                     |
| `--font-size <size>`    | `xs`, `s`, `m`, `l`, `xl`                                       | `m`                   |
| `--chapters <folder>`   | relative folder inside `dir`                                    | `chapters`            |

- In a terminal the first question is always:

  ```text
  How would you like to configure your book?
  ❯ Use default configuration
    Configure with wizard
  ```

  Then language (list: Myanmar, English), title and author, unless given as flags. The wizard
  continues with page size, font family, font size and chapter folder, skipping any given as a
  flag. Lists: ↑/↓ or a digit, Enter to choose; the default is pre-selected and labelled.
- Chapter folder: `❯ Default (chapters)` / `Custom`; only `Custom` asks
  `Chapter folder:` for text.
- Not a terminal: nothing is asked; missing `--lang`, `--title` or `--author` → exit 1 naming
  the flag; other values default.
- `--font` and `--font-family` naming different families → exit 1 naming both flags.
- Unknown value for any list option → exit 1 naming the flag and listing valid values.
- `--chapters` absolute, empty, or leaving `dir` → exit 1 naming the flag.
- Writes `book.json` with `page.size`, `font.family`, `font.size` and
  `chapter_glob: "<folder>/chapter-*.md"` (no `font_set`), and `<folder>/chapter-01.md`. Never
  overwrites; an existing file → exit 1 naming it, nothing written.

## `book.json` keys (all commands)

| Key           | Values                                        | Default                    |
| ------------- | --------------------------------------------- | -------------------------- |
| `page.size`   | `default`, `a5`, `b5`, `a4`, `letter`          | `default`                  |
| `font.family` | family id of the book's language               | from `font_set`, else the language default |
| `font.size`   | `xs`, `s`, `m`, `l`, `xl`                      | `m`                        |

- Invalid value → exit 1: `md2book: <config>: page.size: must be one of default, a5, b5, a4,
  letter` (same form for the other keys).
- `font.family` of the other language → exit 1 naming `font.family`.
- `font.family` and `font_set` naming different families → exit 1 naming both.

## `md2book build pdf`, `qa`, `build all`

- PDF file name: `<output_name>-<suffix>.pdf` and `<output_name>-<suffix>-printed.pdf`, where
  the suffix is the preset's (`170x240` for `default`; data-model.md).
- Page size and typography follow `page.size` and `font.size`; `default` + `m` are unchanged.
- The QA report's page-size line names the preset's target instead of `170 x 240`.

## `md2book fonts`, `cover`, `build epub`, `build web`, `serve`

- The font set is the one resolved from `font.family` (data-model.md); `--set` also accepts the
  new set ids `my-padauk` and `my-masterpiece`.
- Page size and font size do not affect these commands.
