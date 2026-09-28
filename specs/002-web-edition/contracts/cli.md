# CLI contract: `book-build web` and `book-build serve`

Both follow feature 001's rules: exit 0 on success; failure → exit 1 and one line
`book-build: <subject>: <reason>` on stderr; warnings prefixed `warning:`.

## `book-build web --config <path> [--out <dir>]`

- `--out` default: `dist/<config file name without extension>/` in the current directory.
- Writes `<out>/web/` (emptied first) and prints `Web edition written: <dir> (<n> published chapters)`.
- Needs the configured font set in the cache (`book-build fonts`); needs Chromium only when
  `back_cover` is not configured.
- Warns `web_url is not set; canonical and og:url are omitted and og:image is relative`.

API: `web({ config, out? }): Promise<{ dir: string; chapters: number }>`

## `book-build serve --config <path> [--out <dir>] [--port <n>]`

- Builds as `web`, then serves `<out>/web/` at `http://127.0.0.1:<port>/` (default 8000) until
  interrupted; prints the URL.
- Unknown path → `404.html` with status 404. A busy port → exit 1 naming the port.

API: `serve({ config, out?, port? }): Promise<{ url: string; close(): Promise<void> }>`
