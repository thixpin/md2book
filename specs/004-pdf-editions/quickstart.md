# Quickstart: PDF Editions

Prerequisites: Node.js 26+, the font set fetched (`md2book fonts`), Chromium
(`npx playwright install chromium`); optional `pdftotext` (poppler) for the
extraction oracle test and `epubcheck` for `all`.

```console
$ npm run check
$ md2book build pdf --config my-book/book.json
$ md2book build pdf --config my-book/book.json --printed
$ md2book qa --config my-book/book.json
$ md2book build all --config my-book/book.json --printed
```

Expected:

- `dist/book/<output_name>-170x240.pdf`: cover, title, copyright,
  contents with page numbers, chapters with headers and folios
  ([contracts/pdf-output.md](./contracts/pdf-output.md) → Pages);
- `<output_name>-170x240-printed.pdf`: title page first, no colour in
  code, terminal, table and callout blocks; terminal dots show ×, − and +
  like the macOS window controls;
- `QA-REPORT.md` → `## PDF` lists 170 x 240 mm, N of N chapter openings,
  0 replacement characters ([contracts/qa-pdf.md](./contracts/qa-pdf.md));
- `qa-pages/` holds the sample PNGs; open them to review the layout.

Headings (User Story 5): `npm run test:e2e` runs the heading-position
fixture in Chromium and WebKit; in the PDF, no page ends with a heading
followed by fewer than 2 lines of its section.

Rebuild and compare: two `md2book build pdf` runs give the same bytes
(`shasum` of the PDF).

Equivalence with the Python toolchain (SC-001):

```console
$ DEVBOOK=/path/to/development-book npm run equivalence:pdf
```

Visual review (SC-006): compare the Python and md2book sample renders of
the cover, title page, first chapter opening and a page with a terminal
block; record the result in `specs/decision-log.md`.
