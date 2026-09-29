# Data Model: Cover Rendering and npm Packaging

## CoverRender

`{ html (absolute path), output (default <html dir>/cover.png), dpi (default 300, integer 1–1200),
set (from --config's language + font_set, else --set, else "my-sans") }`.

Derived: `pageSizePt: [w, h]` (from `@page` size, else the printed PDF page), `pixels:
[round(w × dpi / 72), round(h × dpi / 72)]`.

## Served paths (virtual origin `http://md2book.local/`)

| path | source |
|---|---|
| `/<html file name>` | the HTML with the font `<style>` injected after `<head>` |
| `/fonts/<file>` | the set's cached faces |
| `/<relative path>` | a file inside the HTML's folder (no `..` escape) |

Anything else → `md2book: cover: unexpected request <url>`.

## Package allow-list

`package.json`, `README.md`, `LICENSE`, `dist/**/*.js`, `dist/**/*.d.ts`, `assets/css/*.css`,
`assets/web-reader.js`, `assets/paged-handler.js`, `assets/fonts-manifest.json`.

## Demo book (`examples/demo-book/`)

`book.json`, `chapters/part-01.md`, `chapters/chapter-0{1,2,3}.md`, `code/…`, `cover/cover.html`,
`cover/cover.png`, `cover/end.png`, `README.md`.
