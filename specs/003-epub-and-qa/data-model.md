# Data Model: EPUB and QA Report

Builds on feature 001 (`BookConfig`, `Chapter`, `Part`, `FontSet`) and 002 (stylesheets).

## Book (loaded once, shared by epub / qa / all)

`{ config, chapters (position slugs ch01…), parts }` — chapters expanded and rendered.

## EpubDocument

| id | href | epub:type | body class | spine |
|---|---|---|---|---|
| `cover` | `text/cover.xhtml` | `cover` | `cover-body` | `linear="no"` |
| `titlepage` | `text/title.xhtml` | `titlepage` | | linear |
| `copyright` | `text/copyright.xhtml` | `copyright-page` | | linear |
| `nav` | `text/nav.xhtml` | — (properties `nav`) | | linear |
| `chNN` | `text/chNN.xhtml` | `bodymatter` | | linear |
| `endimage` | `text/end.xhtml` (only when gated in) | `backmatter` | `end-image-body` | linear |

## EndImage

Enabled when `end_image` is set and the file named by `end_image_after` exists in the chapter
directory (dirname of `chapter_glob`); image stored as `images/end.<ext>`. Log line:
`End image: included` or `End image: withheld (<gate name> not in <chapter dir name>/)`.

## QaReport

Ordered sections (contract: [contracts/qa-report.md](./contracts/qa-report.md)); Unicode issues
capped at 200 with `- ... N more`.

## Reference constants (from `development-book/publish/build.py` and `qa.py`, `d235dbd`)

XHTML document (`xhtml_doc`), `{title}` escaped, `{body_attrs}` = ` class="…"` then
` epub:type="…"` when set:

```text
<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="{lang}" lang="{lang}">\n
<head><meta charset="utf-8"/><title>{title}</title><link rel="stylesheet" type="text/css" href="../css/common.css"/><link rel="stylesheet" type="text/css" href="../css/epub.css"/></head>\n
<body{body_attrs}>\n{body}\n</body>\n</html>\n
```

(The three header lines above are one string in the reference; line breaks shown as `\n` are
literal newlines, others are not.)

Title page: `<div class="title-page"><p class="book-title">{title}</p>` + subtitle
`<p class="book-subtitle">…</p>` when set + `<p class="book-author">{author}</p>` + publisher
`<p class="book-publisher">…</p>` when set + `</div>`.

Copyright page: `<div class="copyright-page"><p>{title}</p><p>Copyright &#169; {year} {author}</p>`
`<p>{licence_text}</p>` + `<p>Publisher: …</p>` when set + `<p>ISBN: …</p>` when set +
`<p>{typeface_line}</p></div>`. Document titles: cover and title page = book title; copyright =
`Copyright`; nav = contents heading; chapter = full title; end = book title.

Cover body: `<div class="cover"><img src="../images/{cover}" alt="Cover"/></div>`.
End body: `<div class="end-image"><img src="../images/{end}" alt=""/></div>`.
Chapter body: `<section epub:type="chapter" id="{slug}">` + chapter head + rendered HTML +
`</section>`.

Nav body: `<nav epub:type="toc" id="toc"><h1>{contents_heading}</h1>{toc with "{slug}.xhtml"}</nav>`
`<nav epub:type="landmarks" hidden="hidden"><ol><li><a epub:type="cover" href="cover.xhtml">Cover</a></li>`
`<li><a epub:type="toc" href="nav.xhtml">Table of Contents</a></li>`
`<li><a epub:type="bodymatter" href="{first slug}.xhtml">Start</a></li></ol></nav>`.

NCX, OPF and container: see [contracts/epub-output.md](./contracts/epub-output.md).
