# CLI contract: `cover`

`md2book cover <file.html> [-o <out.png>] [--dpi <n>] [--config <path> | --set <id>]`

- Writes the PNG (default `cover.png` next to the HTML) and prints
  `Cover written: <file> (<w> x <h> px, <dpi> dpi)`.
- Errors (one line, exit 1, nothing written):

| condition | message |
|---|---|
| HTML missing | `md2book: <html>: cover HTML not found` |
| not one page | `md2book: <html>: expected 1 page, got <n>` |
| `--dpi` not an integer 1–1200 | `md2book: --dpi: not a resolution in dots per inch: <value>` |
| both `--config` and `--set` | `md2book: --set: give --config or --set, not both` |
| fonts missing | as feature 001 FR-042 |
| request outside the folder | `md2book: cover: unexpected request <url>` |
| Chromium missing | `md2book: cover: Chromium is not installed; run: npx playwright install chromium` |

API: `cover({ html, output?, dpi?, config?, set? }) → { file, width, height }`.

# Package and release contract

- Package `@thixpin/md2book@0.1.0`, public, files per data-model.md allow-list.
- `npm run package:check` passes before publishing (`prepublishOnly`: check + build).
- CI runs on pull requests and `v*` tags: check → browser; on tags only, then release (version equals tag; package check;
  `npm publish --access public` with npm trusted publishing (OIDC, no token); provenance is automatic).
