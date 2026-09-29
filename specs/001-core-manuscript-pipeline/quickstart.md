# Quickstart: validate the core manuscript pipeline

Run these from the repository root after the slice is implemented. Contracts:
[cli.md](./contracts/cli.md), [book-config.schema.json](./contracts/book-config.schema.json),
[font-manifest.md](./contracts/font-manifest.md). Entities: [data-model.md](./data-model.md).

## Prerequisites

- Node.js 26+ (`node --version`). With nvm:

  ```console
  $ nvm install 26 && nvm use 26
  ```

- For the equivalence check only: a checkout of `development-book` at
  commit `d235dbd`, and Python 3 with its `publish/requirements.txt`.
- For maintainer font steps only (T053, T066–T067): Python 3 with
  fontTools. Contributors running `npm run check` need neither.

## 1. Install and run the checks

```console
$ npm install
$ npm run check
```

Expected: typecheck, lint, format check and all unit and fixture tests
pass. The fixture tests use `test/fixtures/fonts-source/` and never touch
the network (Constitution VI).

## 2. Create an English book with init (US-6, SC-008)

```console
$ cd "$(mktemp -d)"
$ npx md2book init --lang en --font sans \
    --title "Test Book" --author "Me"
```

Expected: `book.json` and `chapters/chapter-01.md` are created; the
chapter starts with `# Chapter 1 - `; the output ends with the
`md2book fonts` command. Running init again exits 1 and names
`book.json`.

Repeat with `--lang mm --font serif` in another empty directory.
Expected: `"language": "my"`, and the heading uses `အခန်း (၁)`.

## 3. Fetch fonts offline from a local source (US-5)

The offline path (fixture fonts, local folder and a local HTTP server)
is covered by `test/unit/fonts/fetch.test.ts` and
`test/integration/cli-fonts.test.ts` in `npm run check`, including the
checksum-failure case: exit 1 naming the file, nothing kept in the
cache.

`fonts --config` loads the book config, so add a cover first (a
missing cover stops every run, FR-004). After the `fonts-v1` release
exists (task T086), fetch the real set:

```console
$ mkdir cover && cp /path/to/cover.png cover/cover.png
$ export MD2BOOK_FONTS="$(mktemp -d)"
$ npx md2book fonts --config book.json
```

Before the release, a maintainer can run the same step against the
locally built files (task T067) with
`MD2BOOK_FONTS_SOURCE=/path/to/md2book/build/fonts`.

Expected: the seven files of the chosen set and `LICENSE-OFL.txt` in
`$MD2BOOK_FONTS/en-sans/`. This step needs the network once.

## 4. Error paths (SC-004)

The unit suite covers each error in spec FR-050. Spot-check two:

```console
$ npx md2book fonts --set xx-sans
$ npx md2book init --lang fr --title T --author A
```

Expected: both exit 1 with one line listing the valid values.

## 5. Equivalence with the Python toolchain (SC-001 to SC-003)

Not part of `npm run check`; needs `development-book`.

```console
$ export DEVBOOK="$HOME/project/thixpin/development-book"
$ npm run equivalence -- --book book-01
```

Expected: chapter list, part assignment, plain text (whitespace
ignored) and the per-chapter counts of terminal blocks, code blocks,
`wide`/`xwide`, tables and callouts all match the Python output. The
manuscript stays in `development-book`; nothing is copied into this
repository (it is not MIT-licensed).

## 6. Source files stay untouched (SC-005)

Covered by a fixture test that hashes every fixture source before and
after the pipeline runs; it must report no changes.
