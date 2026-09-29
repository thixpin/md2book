# Demo book: Python အခြေခံ

A complete, small book that uses every manuscript format md2book supports. Copy what you need.

## Files

| File | What it shows |
|---|---|
| `book.json` | The book config: title, subtitle, author, language (`my`), font set (`sans`), the chapter and part globs, the code folder, the cover, the end image and its gate, right-hand chapter starts, running heads, the chapters published on the web, a licence line |
| `chapters/chapter-01.md` | A chapter heading `# အခန်း (၁) - Title`, section headings, a terminal block (```` ```console ````), a Note callout, a snippet included from `code/`, a Try-it-yourself callout |
| `chapters/chapter-02.md` | Tables, fenced code in Python, inline code, emphasis, a Warning callout, a scene break (`---`), a longer chapter that spans pages |
| `chapters/chapter-03.md` | Section levels 2–4, bulleted and numbered lists, two snippet includes, a table, all three callout types. Not in `web_published_chapters`, so it stays a draft on the web |
| `chapters/part-01.md`, `part-02.md` | Parts: `# Part I - Title` and `chapters: 1-2` |
| `code/*.py` | Snippet sources with `# #region name` … `# #endregion name`, included with `<!-- include: file.py#name -->` |
| `cover/cover.html` | The cover designed in HTML and CSS; `cover.png` is rendered from it |
| `cover/end.html` | The closing illustration; `end.png` is rendered from it and appears only once `chapter-03.md` exists |

## Build it

From this folder, after installing md2book (see the repository README):

```console
$ md2book fonts --config book.json
$ md2book cover cover/cover.html --config book.json
$ md2book cover cover/end.html -o cover/end.png --dpi 150 --config book.json
$ md2book build all --config book.json
$ md2book build pdf --printed --config book.json
$ md2book serve --config book.json
```

The editions go to `dist/book/`: `python-170x240.pdf`, `python-170x240-printed.pdf`,
`python.epub`, `web/` and `QA-REPORT.md`.
