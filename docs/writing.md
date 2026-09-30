# Writing chapters

A manuscript is a folder of Markdown files: one per chapter, plus
optional part files. The [demo book](https://github.com/thixpin/md2book/tree/master/examples/demo-book) uses every
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

The dash may be a hyphen (`-`), an en dash (`–`) or an em dash (`—`),
with or without spaces; the book always shows a hyphen after the
number, and dashes inside the title are kept (`# အခန်း (၇) — Skills —
Reuse` is chapter 7, "Skills — Reuse"). Part headings accept the same
dashes.

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

## Markdown

Chapters use CommonMark with tables, strikethrough, callouts, and
highlighted code and terminal blocks. [Markdown syntax](markdown.md)
lists everything that is supported, and what is not (images inside
chapters, footnotes, task lists).

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
