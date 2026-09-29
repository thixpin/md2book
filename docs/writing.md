# Writing chapters

A manuscript is a folder of Markdown files: one per chapter, plus
optional part files. The [demo book](../examples/demo-book) uses every
format on this page.

## Chapters

`chapter_glob` in `book.json` matches the chapter files
(`chapters/chapter-*.md` by default); they are read in file-name order,
so number them with leading zeros (`chapter-01.md`, `chapter-02.md`, …).

The first line of each chapter is its heading: the chapter label from
`strings.chapter_label`, the number, a dash and the title.

```markdown
# အခန်း (၁) - Title

# Chapter 1 - Title
```

Myanmar books put the number in brackets; English books do not. Both
accept Myanmar (၁၂၃) or ASCII (123) digits. The numbers must run 1, 2,
3, … in file order; the QA report flags a mismatch.

Inside a chapter, `##` headings are its sections, listed in the QA
report; use `###` and below for smaller headings.

## Parts

Parts group chapters in the contents. Set `part_glob` (for example
`chapters/part-*.md`) and write one file per part: a heading with a
Roman numeral, and the range of chapters it holds.

```markdown
# Part I - Basics

chapters: 1-3
```

A part file in any other shape stops the build.

## Code from files

Include tested code instead of pasting it. The marker is on a line of
its own, and the path is relative to `code_root` (default: the nearest
folder containing `.git`, starting from the one with `book.json`, else
that folder):

```markdown
<!-- include: src/order.ts -->
<!-- include: src/order.ts#total -->
```

The second form includes one region, marked in the source file with
comments:

```ts
// #region total
export function total(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
// #endregion
```

Python and shell files use `# #region total` and `# #endregion`. The
region's common indentation is removed. The code block's language comes
from the file extension (`.ts`, `.js`, `.json`, `.py`, `.sh`). A missing
file or region, or a region that is never closed, stops the build.

## Code blocks

Fenced code blocks are syntax-highlighted by their language:

````markdown
```python
print("မင်္ဂလာပါ")
```
````

Long lines are set in a smaller monospace size so they fit the page;
lines longer still wrap rather than overflow.

## Terminal sessions

A `console` block (or `terminal`, `shell-session`) is drawn as a
terminal window. Lines starting with `$ ` are commands, highlighted as
shell; the others are output.

````markdown
```console
$ python3 hello.py
Hello
```
````

## Tables

Pipe tables:

```markdown
| Type  | Example |
| ----- | ------- |
| `int` | `42`    |
```

## Callouts

GitHub-style alerts become boxed notes. The marker is not
case-sensitive, and the titles come from `strings.callout_titles`.

```markdown
> [!NOTE]
> A side remark.

> [!WARNING]
> Something that can go wrong.

> [!TRY]
> An exercise for the reader.
```

## Scene breaks

A line with `---` between paragraphs is a scene break.

## Closing image

`end_image` in `book.json` adds an image after the last chapter, but
only once the chapter named by `end_image_after` exists. This lets a
book in progress leave out its ending until the final chapter is
written.

```json
"end_image": "cover/end.png",
"end_image_after": "chapter-03.md"
```

## Burmese text

Write Unicode Burmese. The build normalizes text to NFC and adds line
break opportunities between syllables, without changing your files. The
[QA report](editions.md#qa-report) lists problems such as zero-width
spaces, doubled signs and a space before `။`, with file and line.
