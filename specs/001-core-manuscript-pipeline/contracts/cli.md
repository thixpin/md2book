# CLI contract: `book-build` (this slice)

This slice contracts `init` and `fonts`. `pdf`, `epub`, `qa`, `all`, `web`, `serve` and `cover`
are reserved names; they print "not available yet" and exit 1 until their slices land. Every
implemented command has an exported async function in the programmatic API with the same
options (this slice: `init` and `fonts`).

Global rules (FR-050): exit 0 on success; on failure, exit 1 with one line on stderr:
`book-build: <file|key|glob>: <reason>`. Warnings go to stderr prefixed `warning:` and do not
change the exit code.

## `book-build init [dir]`

Creates `book.json` and `chapters/chapter-01.md` in `dir` (default `.`).

| Option | Values | Notes |
|---|---|---|
| `--lang <lang>` | `my`, `mm`, `myanmar`, `en`, `english` | case-insensitive; stored as `my`/`en` |
| `--font <set>` | `sans`, `serif` | default `sans` |
| `--title <text>` | string | required |
| `--author <text>` | string | required |

- TTY and a value missing → prompt for it. Not a TTY and `--lang`, `--title` or `--author`
  missing → exit 1 naming the missing flag.
- `book.json` or `chapters/chapter-01.md` already exists → exit 1 naming it; nothing written.
- Unknown `--lang`/`--font` → exit 1 listing valid values.
- The written config sets `output_name` to the title slug (or `book`) and
  `strings.licence_text` to the MIT licence line (FR-063).
- Success prints the files written and `book-build fonts --config <dir>/book.json`.
- No network access.

API: `init(options: { dir?, lang, font?, title, author }): Promise<{ files: string[] }>`

## `book-build fonts`

Fetches and verifies the font set named by the config.

| Option | Notes |
|---|---|
| `--config <path>` | book config; its `language` + `font_set` pick the set |
| `--set <id>` | alternative to `--config`: `my-sans`, `my-serif`, `en-sans`, `en-serif` |
| `--fonts <dir>` | cache root (overrides `MD2BOOK_FONTS`) |

- Cache root: `--fonts` → `MD2BOOK_FONTS` → `$XDG_CACHE_HOME/md2book/fonts` →
  `~/.cache/md2book/fonts`. Files go in `<root>/<set-id>/`.
- Source: `MD2BOOK_FONTS_SOURCE` (URL or local directory) → release URL from the manifest.
- Files already present with the right SHA-256 are not fetched again.
- SHA-256 mismatch → exit 1 naming the file; the bad download is not kept.
- Success prints the cache directory.

API: `fonts(options: { config? , set?, fontsDir? }): Promise<{ dir: string, files: string[] }>`

## Missing fonts (all later build commands)

Any run needing fonts with a file missing exits 1:
`book-build: <cache dir>: font set <id> not found; run: book-build fonts --config <path>`.
