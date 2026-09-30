# Markdown syntax

Chapters are written in [CommonMark](https://commonmark.org/) with a
few extensions: tables, strikethrough, callouts, and highlighted code
and terminal blocks. The same Markdown produces the PDF, the EPUB and
the web edition. For chapter files, headings, parts and code includes,
see [Writing chapters](writing.md).

## At a glance

| Syntax                                       | Supported                                              |
| -------------------------------------------- | ------------------------------------------------------ |
| Headings `##` to `######`                    | yes (`#` only as the chapter heading)                  |
| Paragraphs and line breaks                   | yes                                                    |
| Bold, italic, inline code                    | yes                                                    |
| Strikethrough `~~text~~`                     | yes                                                    |
| Links and `<https://…>` autolinks            | yes                                                    |
| Ordered and unordered lists                  | yes                                                    |
| Blockquotes                                  | yes                                                    |
| Callouts `> [!NOTE]`, `[!WARNING]`, `[!TRY]` | yes                                                    |
| Tables                                       | yes                                                    |
| Fenced and indented code blocks              | yes, highlighted by language                           |
| Terminal blocks (`console`)                  | yes                                                    |
| Scene breaks `---`                           | yes                                                    |
| Inline HTML                                  | passed through; flagged by QA                          |
| Code includes `<!-- include: … -->`          | yes, see [Code from files](writing.md#code-from-files) |
| Images `![alt](file.png)`                    | **no**; use `cover` and `end_image`                    |
| Footnotes `[^1]`                             | **no**                                                 |
| Task lists `- [ ]`                           | **no**                                                 |
| Sub- and superscript `H~2~O`, `x^2^`         | **no**                                                 |
| Bare URLs turned into links                  | **no**; wrap them in `<…>`                             |
| Smart quotes and dashes                      | **no**; type the characters you want                   |
| Math, diagrams, emoji shortcodes             | **no**                                                 |

Unsupported syntax is not an error: it is printed as plain text (a task
list shows `[ ] task`), except images, which stop the PDF build.

## Headings

```markdown
# Chapter 1 - Getting Started

## A section

### A subsection
```

The first line of a chapter is its heading (see
[Chapters](writing.md#chapters)); do not use `#` anywhere else. `##`
headings are the chapter's sections: they are listed in the QA report
and never left alone at the foot of a PDF page. Use `###` to `######`
for smaller headings.

A line of text directly followed by `---` or `===` is also a heading
(CommonMark "setext" headings); leave a blank line before a scene
break.

## Paragraphs and line breaks

Separate paragraphs with a blank line. Inside a paragraph, a line
ending with a backslash `\` (or two spaces) forces a line break; a plain
line break is just a space.

```markdown
First line\
second line of the same paragraph.

A new paragraph.
```

## Emphasis and inline code

```markdown
**bold**, _italic_, _**bold italic**_, ~~struck through~~ and `code`
```

Inline code is set in Noto Sans Mono, which also covers Burmese.

## Links

```markdown
[the Python docs](https://docs.python.org/3/)
<https://docs.python.org/3/>
```

A bare `https://…` stays plain text; wrap it in `<…>` to make it a
link. The QA report's HTML check also lists `<…>` autolinks, because
they look like tags; `[text](url)` avoids that.

### Links between chapters

A manuscript written to be read on GitHub often links its chapter files
to each other and to the repository's `README.md`. md2book turns those
links into links inside each edition:

```markdown
[← Chapter 1](01-intro.md) · [Contents](../README.md) · [Chapter 3 →](03-tools.md)
```

| Link to                                           | Becomes                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| a chapter file of the book                        | a link to that chapter (its page on the web, its document in the EPUB, its first page in the PDF) |
| `README.md` (any folder)                          | a link to the book's start: the web edition's home page, the contents in the EPUB and the PDF     |
| any other `.md` file, like an unpublished chapter | its text only, without a link                                                                     |

Paths are relative to the chapter file, as on GitHub; a `#section` after
the file name is dropped. Web addresses, `#anchors`, root paths and
other files stay as written. On the web edition, following a chapter
link turns the book to that chapter.

## Lists

```markdown
- An item
- Another item
  - A nested item

1. First
2. Second
```

## Blockquotes

```markdown
> A quotation, which can span
> several lines.
```

## Callouts

A blockquote that starts with a marker becomes a boxed note. The marker
is not case-sensitive; the titles come from
[`strings.callout_titles`](configuration.md#strings).

```markdown
> [!NOTE]
> A side remark.

> [!WARNING]
> Something that can go wrong.

> [!TRY]
> An exercise for the reader.
```

| Marker       | Default title   |
| ------------ | --------------- |
| `[!NOTE]`    | Note            |
| `[!WARNING]` | Warning         |
| `[!TRY]`     | Try it yourself |

Other GitHub markers such as `[!TIP]` or `[!IMPORTANT]` are not
callouts; they stay ordinary blockquotes that show the marker text.

## Tables

Pipe tables, with optional column alignment:

```markdown
| Type    | Example | Size |
| :------ | :-----: | ---: |
| `int`   |  `42`   | 28 B |
| `float` | `3.14`  | 24 B |
```

## Code blocks

Fence code with three backticks (or `~~~`) and name the language:

````markdown
```python
def greet(name):
    return f"မင်္ဂလာပါ {name}"
```
````

Highlighting uses [Prism](https://prismjs.com/), so every Prism
language name and alias works (`python`, `py`, `ts`, `js`, `json`,
`bash`, `yaml`, `sql`, …). A block with no language, an unknown one, or
indented by four spaces is set as plain code.

Long lines are set in a smaller monospace size so they fit the page;
lines longer still wrap rather than overflow.

## Terminal blocks

A `console` block (or `terminal`, `shell-session`) is drawn as a
terminal window. Lines starting with `$ ` are commands, highlighted as
shell; the others are output.

````markdown
```console
$ python3 hello.py
Hello
```
````

## Scene breaks

A line with `---` between paragraphs, with a blank line before and
after it, is a scene break.

```markdown
The end of one scene.

---

The start of the next.
```

## Inline HTML

HTML in a chapter is passed through to every edition, so keep it
simple and well-formed (EPUB is XHTML). The QA report lists each line
that contains an HTML tag, so prefer Markdown where it exists.

```markdown
Press <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop.
```

## Images

Images inside chapters are not supported: the PDF build stops with
`unexpected request` and the EPUB would reference a missing file. The
book's images are the `cover`, the web edition's `back_cover` and the
closing `end_image`, set in [`book.json`](configuration.md#images).
