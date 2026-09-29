# CLI contract: `epub`, `qa`, `all`

Rules of feature 001 apply (exit codes, one-line errors, `warning:` lines).

- `book-build epub --config <path> [--out <dir>]` → `<out>/<output_name>.epub` and `<out>/src/epub/`;
  prints `EPUB written: <file>`; prints the end-image line when `end_image` is set.
- `book-build qa --config <path> [--out <dir>]` → `<out>/QA-REPORT.md`; checks
  `<out>/<output_name>.epub` if present; prints `QA report written: <file>`.
- `book-build all --config <path> [--out <dir>]` → `epub`, then `qa` (the PDF step is added by
  the PDF feature).
- `--out` default: `dist/<config file name without extension>/`.
- Needs the configured font set cached (`book-build fonts`); `epubcheck` optional on `PATH`.

API: `epub({config, out?}) → {file}`, `qa({config, out?}) → {file}`, `all({config, out?}) → {epub, report}`.
