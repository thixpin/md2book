# QA report contract: PDF section

Replaces `- PDF not built.` (feature 003) when the edition's PDF exists. All other sections are
unchanged. Lines, in order:

```text
## PDF

- File: {file name}
- Edition: {screen | printed (no cover page, black-and-white code)}
- Pages: {n}
- Page size: {w} x {h} mm (target 170 x 240)
- Fonts embedded: {comma-separated BaseFont names | none detected}
- Body font size: 11 pt; line spacing 1.55; first-line indent 6 mm; no extra space between paragraphs
- Margins: top 20 mm, bottom 22 mm, inside 24 mm, outside 18 mm
- Chapter opening pages detected: {k} of {N}
- Nearly empty pages (3 lines or fewer, after front matter): {[(page, lines), …] | none}
- Extracted text characters (excl. whitespace): {n,} (manuscript: {chars_nospace,}; PDF includes front matter, headers, page numbers)
- Text extraction check (copy/search): {r} replacement characters; non-Burmese non-ASCII characters present: {[('c', n), …] | none} (all from the manuscript). Syllable-break zero-width spaces are layout-only and not part of the extracted text.
- Extracted Burmese is in logical (typed) order: the PDF carries the text of each shaped cluster.
- Sample renders in qa-pages/: {comma-separated file names}
```

Differences from the reference (decision log): no `Em dash on pages` line (feature 003 removed em
dash checks); the glyph-order and zero-width-space sentences describe what the new PDFs contain (research R-02); the samples path is
relative to the report. Python list formatting is reproduced for the page and stray lists
(`[(12, 2), (40, 1)]`, `[('×', 7)]`, `pyRepr` for characters). Numbers use `en-US` thousands
separators; page size uses Python rounding (`pyRound`) to one decimal.
