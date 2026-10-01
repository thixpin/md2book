---
layout: home

hero:
  name: md2book
  text: Books from Markdown
  tagline: A print-ready PDF, an EPUB 3, a web edition and a QA report from one manuscript, with first-class Myanmar (Burmese) support.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Usage examples
      link: /examples
    - theme: alt
      text: GitHub
      link: https://github.com/thixpin/md2book

features:
  - title: PDF
    details: A 170 × 240 mm book with cover, title and copyright pages, contents with page numbers, running headers, and a black-and-white print-shop edition.
    link: /editions#pdf
  - title: EPUB 3
    details: Reflowable, with the book's fonts embedded.
    link: /editions#epub
  - title: Web edition
    details: A static site that reads like a real book, with page turns, two-page spreads, search, bookmarks and adjustable text size.
    link: /editions#web-edition
  - title: QA report
    details: Manuscript, Unicode and Burmese text, typeface coverage, PDF and EPUB checks, without changing your files.
    link: /editions#qa-report
  - title: Covers
    details: Designed in HTML and CSS, rendered to PNG with the book's fonts.
    link: /cover
  - title: Myanmar script
    details: Burmese headings and page numbers, syllable-based line breaking and curated Noto fonts, verified and cached for offline use.
    link: /fonts
---

## See it in action

See how md2book turns a Markdown manuscript into a real Burmese tech book.

<div style="position: relative; aspect-ratio: 16 / 9; margin-top: 16px; border-radius: 12px; overflow: hidden; background: var(--vp-c-bg-soft);">
  <iframe
    src="https://www.youtube-nocookie.com/embed/UpmgagatMpc"
    title="md2book: see it in action"
    style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0;"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
  ></iframe>
</div>

## How it works

A 60-second tour in seven steps: install, init, write, fonts, build,
preview and publish to GitHub Pages.

<div style="position: relative; aspect-ratio: 16 / 9; margin-top: 16px; border-radius: 12px; overflow: hidden; background: var(--vp-c-bg-soft);">
  <iframe
    src="https://www.youtube-nocookie.com/embed/vEG7KM14Oh4"
    title="How md2book works: Markdown to PDF, EPUB and web book in 7 steps"
    style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0;"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
  ></iframe>
</div>

## Quick start

```console
$ npm install -g @thixpin/md2book
$ npx playwright install chromium
$ md2book init my-book --lang en --title "My Book" --author "Me"
$ cd my-book
$ mkdir cover && cp ~/my-cover.png cover/cover.png
$ md2book fonts
$ md2book build all
```

Continue with [Getting started](/getting-started).
