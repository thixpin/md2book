# Quickstart: validate the web edition

Prerequisites: Node.js 26+, `npm install`, the configured font set fetched
(`book-build fonts`), and for back-cover generation and browser tests:

```console
$ npx playwright install chromium
```

## 1. Checks

```console
$ npm run check
$ npm run test:e2e
```

Expected: unit, integration and browser tests pass (browser tests use
a local server only).

## 2. Build and read the demo book

```console
$ book-build web --config my-book/book.json
$ book-build serve --config my-book/book.json
```

Open `http://127.0.0.1:8000/`: the book is closed on its cover; click
Next or press → to open it; pages turn with a curled sheet. Resize to a
narrow window: one page; wide window: a two-page spread.

## 3. Drafts never leak

Add a chapter file that is not listed in `web_published_chapters`,
rebuild, and search the output:

```console
$ grep -r "DRAFT-MARKER" dist/book/web || echo "not published"
```

Expected: `not published`.

## 4. Equivalence with the Python web build (SC-001)

With `DEVBOOK` pointing at `development-book` (`d235dbd`), build
`book-01` with both toolchains and compare the file trees (ignoring
hashes) and the DOM of `index.html` and `chapters/ch01.html`:

```console
$ npm run equivalence:web -- --book book-01
```
