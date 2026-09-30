# CLI contract: `md2book build web` and `md2book serve`

Both follow feature 001's rules: exit 0 on success; failure → exit 1 and one line
`md2book: <subject>: <reason>` on stderr; warnings prefixed `warning:`.

## `md2book build web --config <path> [--out <dir>] [--web-url <url>]`

- `--out` default: `dist/<config file name without extension>/` in the current directory.
- Writes `<out>/web/` (emptied first) and prints `Web edition written: <dir> (<n> published chapters)`.
- Needs the configured font set in the cache (`md2book fonts`); needs Chromium only when
  `back_cover` is not configured.
- Warns `web_url is not set; canonical and og:url are omitted, og:image is relative and there is no sitemap.xml`.
- `--web-url` replaces the config's `web_url` for this build; not an absolute http(s) URL → exit 1,
  `md2book: --web-url: must be an absolute http(s) URL, like https://book.example.com/`.

API: `web({ config, out?, webUrl? }): Promise<{ dir: string; chapters: number }>`

## `md2book serve --config <path> [--out <dir>] [--port <n>] [--web-url <url>]`

- Builds as `web`, then serves `<out>/web/` at `http://127.0.0.1:<port>/` (default 8000) until
  interrupted; prints the URL. A site URL with a path (`https://owner.github.io/repo/`) is served
  under it (`http://127.0.0.1:<port>/repo/`); other paths get the 404 page.
- Unknown path → `404.html` with status 404. A busy port → exit 1 naming the port.

API: `serve({ config, out?, port?, webUrl? }): Promise<{ url: string; close(): Promise<void> }>`
