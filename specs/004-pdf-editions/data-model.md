# Data Model: PDF Editions

Builds on feature 001 (`BookConfig`, `Chapter`, `Part`, `FontSet`), 003 (`Book`, `EndImage`,
`frontMatterHtml`, QA report) and 002 (`substituteFonts`).

## PdfEdition

| edition | file | intermediate HTML | cover page | extra stylesheet | QA front pages |
|---|---|---|---|---|---|
| screen | `<output_name>-170x240.pdf` | `src/book-print.html` | yes | — | cover, title, copyright, toc |
| printed | `<output_name>-170x240-printed.pdf` | `src/book-printed.html` | no | `printed.css` | title, copyright, toc |

## PrintDocument (intermediate HTML)

```text
<!DOCTYPE html><html lang="{language}"><head><meta charset="utf-8"/>
<title>{title}</title>{stylesheet links}{Paged.js scripts}</head>
<body data-title="{title}">
[<div class="cover-page"><img src="/book/cover{ext}" alt="Cover"/></div>]      screen only
<section class="front">{title page}</section>
<section class="front">{copyright page}</section>
<section class="front toc-page"><h1>{strings.contents_heading}</h1>{toc list, href "#{slug}"}</section>
<section class="chapter group-a|group-b[ recto]" id="chNN">{chapter head}{fitted, broken body}</section> …
[<section class="end-image-page"><img src="/book/end{ext}" alt=""/></section>]  when gated in
</body></html>
```

The reference joins these pieces with `\n`. `group-a` when the chapter's index is odd; `recto`
when `recto_chapter_start` is true. Body = `fitPreBlocks(addSyllableBreaks(chapter.html))`.

## Served paths (virtual origin `http://md2book.local/`)

| path | source |
|---|---|
| `/index.html` | the print document |
| `/css/common.css`, `/css/print.css`, `/css/printed.css`, `/css/paged.css`, `/css/book.css` | carried assets with `substituteFonts`; `book.css` = generated rules |
| `/fonts/<file>` | the set's cached font files (`print.css` uses `../fonts/…`) |
| `/pagedjs/paged.polyfill.js`, `/pagedjs/handler.js` | `pagedjs/dist/paged.polyfill.js` with the two md2book patches (research R-01), `assets/paged-handler.js` |
| `/book/cover{ext}`, `/book/end{ext}` | config `cover`, gated `end_image` |

Any other path → build error `md2book: pdf: unexpected request <path>`.

## Generated rules (`book.css`, appended last)

- `@page :left { @top-left { content: "{title as CSS string}"; } }`
- when `running_headers` is false: `@page :left{@top-left{content:none}} @page :right{@top-right{content:none}}`

## PdfFacts (QA read-back)

`{ pages, sizeMm: [w, h] (page min(5, n−1)+1, MediaBox `x2 − x1` and `y2 − y1`, one decimal), fonts (sorted BaseFont names),
lines: string[][] (per page, top to bottom), text: string (all pages joined) }`.

## PdfChecks

`{ chapterStarts: Map<slug, page>, shortPages: [page, lines][], textChars, replacement, stray:
[char, count][] (top 8), samples: string[] }` — formulas in the reference constants below.

## Reference constants (`build.py`, `print.css`, `printed.css`, `qa.py` at `d235dbd`)

- Page 170 × 240 mm = 481.89 × 680.31 pt; margins top 20, bottom 22, inside 24, outside 18 mm.
- `fit_pre_blocks`: `pt = max(6.0, min(8.3, 123.0 / (max(longest, 1) × 0.6 × 25.4 / 72)))`,
  written as `style="font-size: {pt:.2f}pt"` on the `<pre …>` tag; `longest` = the longest line
  (split on `\n`) of the `<pre>` inner HTML after removing tags and decoding entities, in code
  points.
- `add_syllable_breaks`: split on `(<pre\b.*?</pre>|<code\b.*?</code>|<[^>]+>)` (dot matches
  newlines); in the other pieces insert U+200B at
  `(?<=[က-႟])(?<!္)(?=[က-အ](?![်္]))`.
- QA `pdf_checks`:
  - short page: page number > front-page count and ≤ 3 non-empty lines;
  - chapter start: first page (not yet assigned) whose text contains label and title, with < 40
    non-empty lines, where among the first 6 lines a line equal (trimmed) to the label is directly
    followed by a line equal to the title;
  - `text_chars` = sum over pages of the text length without `\s` (Python semantics, R-04 of
    spec 003; U+200B is not whitespace);
  - stray: code point > 0x7F, not U+1000–U+109F, Unicode category not P* or Z*, not `©` or
    U+200B; the 8 most common, first-seen order for ties;
  - samples: front pages 1…k named as the edition's front pages; first chapter start →
    `ch01-open`, +1 `ch01-p2`, +2 `ch01-p3`; chapter `len//2` → `mid-chapter-open`, +1
    `mid-chapter-p2`; last chapter → `last-chapter-open`; last page → `last-page`; later
    assignments win on the same page; only pages 1…n; file `page-{NNN}-{name}.png`, sorted by page.
- MM per pt = 25.4 / 72.

## State

`pdf` rebuilds `src/book-print*.html` and the PDF (temp file + rename). `qa` rebuilds `qa-pages/`
when the edition's PDF exists; otherwise it leaves `qa-pages/` alone and prints `PDF not built.`.
