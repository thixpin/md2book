# Contract: QA-REPORT.md

Lines joined with `\n`; `{n:,}` = number with thousands separators.

```text
# QA Report: {title}

Generated: {local ISO time, seconds}

## Manuscript

- Chapters: {n}
- Chapter order: OK (files sorted, numbering 1..N matches labels) | MISMATCH, see list
- Code snippet includes: {n} (all resolved; the build stops on a missing file or region)
- Approximate word count (whitespace tokens): {n:,}
- Character count (incl. spaces): {n:,}
- Character count (excl. spaces): {n:,}
- Myanmar-script characters: {n:,}

| # | Label | Title | Sections |
|---|---|---|---|
| {index} | {label} | {title} | {sections} |      (one row per chapter)

## Unicode / Burmese text checks

- {issue}                                          (≤ 200, then "- ... {n} more")
- No issues found (NFC, no replacement/control chars, no doubled signs or punctuation, no repeated words, no HTML tags).

## Typeface coverage

- Body text: {body family} (Regular, Bold, Italic, Bold Italic).
- Chapter titles: {body family} Bold. Chapter numbers and section headings: {body family} SemiBold.
- Terminal output, commands, logs and inline code: {mono family} (Regular, Bold).
- Myanmar-script characters (from the {body family} glyph set): {n:,}
- Latin/digit/punctuation characters (from the merged Latin glyph sets): {n:,}
- Characters covered by none of the book fonts (system symbol/emoji fallback in PDF, reader fallback in EPUB):
  - U+{XXXX} {NAME} x{n}
| - All characters covered by the two embedded fonts.

## PDF

- PDF not built.

## EPUB

- File: {name}
- Reflowable: yes (no fixed-layout metadata) | NO (fixed layout metadata present)
- Fonts embedded: {file names, comma-separated}
- Chapter documents: {n}
- Chapter text identical to manuscript render: yes | MISMATCH in {slugs}
- Structural errors: none | {list}
- epubcheck: PASS | FAIL (then a blank line and a ```text block with the output tail)
| - epubcheck: NOT RUN (epubcheck not installed; `brew install epubcheck`)
| - EPUB not built.

## Metadata placeholders (must be filled before publication)

- {key}: {value}                                    (title, subtitle, author, publisher, year, isbn)

## Known layout limitations

(four bullets, verbatim from the reference)

## Content / continuity issues found but NOT changed

- None recorded by the automated checks. Add manual review notes here.
```

Unicode issue formats (file = chapter file name):
`{file}: text is not NFC-normalized (build normalizes it)`; `{file}: {n} x U+FFFD replacement char`
(also `zero-width space`, `no-break space`, `BOM`); `{file}: {n} control characters`;
`{file}:{line}: doubled vowel/medial sign {repr}`; `{file}:{line}: doubled punctuation {repr}`;
`{file}: {n} x space before ။/၊ (reported, not changed)`;
`{file}:{line}: double space inside prose line`; `{file}:{line}: repeated word {repr}`;
`{file}:{line}: HTML tag in manuscript`.

Removed from the reference (decision log): the Em dash search section; the EPUB em dash line; the
typeface sentences about `publish/fonts.py` and `Public-Instruction.md`.
