# Quickstart: EPUB and QA

Prerequisites: Node.js 26+, the font set fetched (`book-build fonts`);
optional `epubcheck` on PATH (`brew install epubcheck`).

```console
$ npm run check
$ book-build all --config my-book/book.json
$ epubcheck dist/book/*.epub
$ open dist/book/QA-REPORT.md
```

Expected: `<output_name>.epub` opens in an e-reader (Apple Books,
Thorium); epubcheck reports no errors; the report lists the manuscript
counts, Unicode findings, coverage and EPUB checks.

Equivalence with the Python toolchain (SC-001–003):

```console
$ DEVBOOK=/path/to/development-book npm run equivalence:epub-qa
```
