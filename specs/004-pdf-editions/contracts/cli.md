# CLI contract: `pdf`, `qa --printed`, `all --printed`

Rules of feature 001 apply (exit codes, one-line errors `md2book: <subject>: <reason>`, `warning:`
lines). `--out` default: `dist/<config file name without extension>/`.

- `md2book pdf --config <path> [--out <dir>] [--printed]`
  - screen: `<out>/<output_name>-170x240.pdf` and `<out>/src/book-print.html`;
  - `--printed`: `<out>/<output_name>-170x240-printed.pdf` and `<out>/src/book-printed.html`;
  - prints the end-image line (as `epub`) when `end_image` is set, then `PDF written: <file>`.
- `md2book qa --config <path> [--out <dir>] [--printed]` → checks the edition's PDF when it
  exists (writing `<out>/qa-pages/`) and `<out>/<output_name>.epub` when it exists; prints
  `QA report written: <file>`.
- `md2book all --config <path> [--out <dir>] [--printed]` → `pdf`, then `epub`, then `qa`, all
  with the same `--printed`.
- `cover` stays reserved (`not available yet`).

Needs: the configured font set cached (`md2book fonts`), the cover file, and Chromium
(`npx playwright install chromium`). Errors (one line, exit 1, no PDF left at the output path):

| condition | message |
|---|---|
| fonts missing | as feature 001 FR-042 (`run: md2book fonts --config <path>`) |
| Chromium missing | `md2book: pdf: Chromium is not installed; run: npx playwright install chromium` |
| unknown served path | `md2book: pdf: unexpected request <path>` |
| layout does not finish in 10 minutes | `md2book: pdf: page layout did not finish` |

API (Constitution VIII): `pdf({config, out?, printed?}) → {file}`;
`qa({config, out?, printed?}) → {file}`; `all({config, out?, printed?}) → {pdf, epub, report}`.
