# Contract: web output

## Tree (`<out>/web/`)

```text
index.html
404.html
chapters/chNN.html        one per published chapter (NN = chapter number)
style.<hash12>.css
reader.<hash12>.js
fonts/*.ttf, fonts/LICENSE-OFL.txt
cover.<ext>
back-cover.<ext>
og-image.png
favicon.svg, favicon-32.png, apple-touch-icon.png   (configured or default)
```

## Page shell

`<html lang>`; viewport meta; `<title>`; `meta[name=description]`; social tags (canonical and
`og:url` only with `web_url`; `robots noindex` only on 404; `og:type` `book`/`article`;
`og:site_name`, `og:title`, `og:description`, `og:image` (+ width, height, alt);
`twitter:card=summary_large_image`); hashed stylesheet; favicon links (always: configured or default icon).
`header.site-header > a[href="/"][data-home]` (`.site-title`, `.site-subtitle`) + reader toolbar;
`main`; `footer.footer` (author); deferred reader script (not on 404).

## Reader DOM

Exactly the reference structure of `web.py` `reader()` (lines 567–706): `div.reader-shell[data-reader]`
with `data-book-key`, `data-book-title`, `data-open-chapter`, `data-cover-src`,
`data-back-cover-src`, `data-cover-ratio`, `data-cover-edge`, and — only when not default —
`data-folio-digits`, `data-name-cover`, `data-name-contents`, `data-name-back-cover`. Inside:
`.book[data-book]` (paper svg, `.reader-window > article.reader-flow` with front sections,
`section.book-chapter[data-chapter][data-title][data-short-title][data-href]`, back sections,
`span.flow-end`), gutter, two page numbers, cover and back cover, turn layer, crease;
`nav.reader-controls`; popovers `#reader-contents` and `#reader-search`.

The contents page heading is `strings.contents_heading` (`မာတိကာ` by default).
