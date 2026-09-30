# Quickstart: validating spec 006

Run from the repository root after `npm install` and `npx playwright install chromium`.

## 1. Automated checks

```console
$ npm run check
$ npm run test:e2e
$ npm run equivalence:pdf      # with DEVBOOK set, as in spec 004
```

Expected: all pass; the default preset (`default`, `m`, `noto-sans-myanmar`) still matches the
reference PDF (SC-001).

## 2. Every page size × font size (SC-002)

The matrix test in `test/integration/pdf-presets.test.ts` builds the headings fixture for all 25
combinations and checks page size, headings kept with two lines, and no text outside the text
area. To look at the results by hand:

```console
$ cp -r examples/demo-book /tmp/presets && cd /tmp/presets
$ for p in default a5 b5 a4 letter; do for f in xs m xl; do
>   node ../md2book/src/bin.ts build pdf --out dist/$p-$f \
>     --config <(jq ".page.size=\"$p\" | .font.size=\"$f\"" book.json)
> done; done
```

(`--config` needs a real file on some shells; write the variants to `book-$p-$f.json`
instead.) Expected: each PDF has the preset's page size and file suffix; smaller sizes give
fewer pages.

## 3. Font families (SC-003)

```console
$ MD2BOOK_FONTS_SOURCE=build/fonts node src/bin.ts fonts --set my-padauk
$ MD2BOOK_FONTS_SOURCE=build/fonts node src/bin.ts fonts --set my-masterpiece
```

Then build `test/fixtures/book-fonts` once per family and render the sample pages to PNG
(`qa` writes them to `qa-pages/`). Review side by side, for each family: stacked consonants,
medials, vowel signs, kinzi; Latin; bold and italic (synthesised where the family has no face);
code and terminal blocks in Noto Sans Mono; tables; callouts; chapter openings; headers and
footers. Record the result in `specs/decision-log.md`.

## 4. init

```console
$ md2book init /tmp/a                      # choose "Use default configuration"
$ md2book init /tmp/b                      # choose the wizard, A5, Padauk, Large, Custom "src"
$ md2book init /tmp/c --lang my --title T --author A --page-size b5 \
>   --font-family padauk --font-size s --chapters text < /dev/null
```

Expected: `/tmp/a/book.json` has `page.size` `default`, `font.family` `noto-sans-myanmar`,
`font.size` `m`; `/tmp/b` has `a5`, `padauk`, `l` and `src/chapter-01.md`; `/tmp/c` is written
without any question.
