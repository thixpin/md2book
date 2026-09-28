# Data Model: Core Manuscript Pipeline

All entities are in-memory; the only persisted data are the config file (author-owned), chapter
sources (read-only) and the font cache. Field names below are the config keys or the TypeScript
property names.

## BookConfig

Loaded from one JSON file; contract in [contracts/book-config.schema.json](./contracts/book-config.schema.json).
Paths resolve against the config file's directory (FR-003).

| Key | Type | Required | Default / rule |
|---|---|---|---|
| `title` | string | yes | |
| `subtitle` | string | no | |
| `author` | string | yes | |
| `publisher` | string | no | empty → absent (FR-005) |
| `year` | string | yes | |
| `isbn` | string | no | empty → absent (FR-005) |
| `language` | `"my"` \| `"en"` | no | `"my"` (as in REF §1); other values stop the run, listing valid values (FR-009) |
| `identifier` | string | yes | init writes `urn:uuid:<random>` |
| `output_name` | string | yes | init writes an ASCII slug of the title, or `book` |
| `cover` | path | yes | empty or missing file stops the run (FR-004) |
| `back_cover` | path | no | used by web slice |
| `favicon` | path | no | used by web slice |
| `web_url` | URL string | no | used by web slice |
| `description` | string | no | used by web slice |
| `chapter_glob` | glob | yes | no match stops the run |
| `part_glob` | glob | no | |
| `web_published_chapters` | string[] | no | validated by web slice |
| `recto_chapter_start` | boolean | no | `false`; used by PDF slice |
| `running_headers` | boolean | no | `true`; used by PDF slice |
| `end_image` | path | no | used by later slices |
| `end_image_after` | file name | no | used by later slices |
| `font_set` | `"sans"` \| `"serif"` | no | `"sans"`; must be offered for `language` (FR-044) |
| `code_root` | path | no | nearest ancestor with `.git`, else config dir (FR-008) |
| `strings` | object | no | per-key defaults from the language profile (FR-007) |

**Validation** (FR-002): wrong type or missing required key → stop, naming the key; unknown
key at any level (reported as a path, e.g. `strings.chapter_lable`) → warning, continue. Values containing `PLACEHOLDER` → collected in
`placeholders: {key, value}[]` (FR-006).

### `strings` (series strings, FR-007)

| Key | `my` default | `en` default |
|---|---|---|
| `chapter_label` | `အခန်း` | `Chapter` |
| `chapter_digits` | `"myanmar"` | `"ascii"` |
| `contents_heading` | `မာတိကာ` | `Contents` |
| `page_names.cover` / `.contents` / `.back_cover` | `Cover` / `Contents` / `Back cover` | same |
| `callout_titles.note` / `.warning` / `.try` | `Note` / `Warning` / `Try it yourself` | same |
| `licence_text` | CC BY-NC-ND 4.0 paragraph from REF §6 | same (init writes MIT text explicitly) |
| `typeface_line` | `Typeface: <body family of font set>` | same |
| `storage_prefix` | `devbook` | `devbook` |

An explicit value always wins over the profile default. Changing `language` changes only keys
not set explicitly.

## LanguageProfile

Fixed data, two entries (`my`, `en`): default `strings`, chapter heading shape, and the font sets
offered.

| Language | Heading shape | Example |
|---|---|---|
| `my` | `# <label> (<digits>) - <title>` | `# အခန်း (၁) - Title` |
| `en` | `# <label> <digits> - <title>` | `# Chapter 3 - Title` |

Both accept Myanmar (`၀-၉`) and ASCII digits; number = digits mapped to ASCII.

## Chapter

| Field | Rule |
|---|---|
| `index` | 1-based position after code-point sort of glob matches |
| `slug` | `ch` + two-digit `index` |
| `label` | heading label, e.g. `အခန်း (၁)`, `Chapter 3` |
| `title` | heading title, trimmed |
| `fullTitle` | `<label> - <title>` |
| `number` | integer from label digits |
| `sections` | `##` headings in the body, in order |
| `sourcePath` | absolute path; never written |
| `bodyMd` | text after heading: NFC, LF, blank lines trimmed at both ends, one final `\n` |
| `expandedMd` | `bodyMd` after snippet expansion |
| `html` | rendered XHTML fragment |
| `plainText` | tags → space, entities decoded, space/tab runs collapsed |
| `includes` | `SnippetInclude[]` |
| `uncovered` | characters not in the font set (FR-046), filled when a coverage check runs |

Errors: first non-empty line not a heading → stop (file, line).

## Part

| Field | Rule |
|---|---|
| `label` | `Part <Roman>` |
| `title` | heading title |
| `first`, `last` | from `chapters: a-b` |
| `chapters` | chapters with `first <= number <= last`, first matching part wins |

Errors: missing heading or range → stop (file); with parts present, a chapter no part covers →
stop (chapter file, number). Parts with no chapters are omitted from the contents list.

## SnippetInclude

| Field | Rule |
|---|---|
| `chapter` | owning chapter |
| `path` | relative to `code_root` |
| `region` | optional, ASCII `[A-Za-z0-9_-]+` |
| `language` | from extension: `.ts`→`ts`, `.js`→`js`, `.json`→`json`, `.py`→`python`, `.sh`→`bash`, else none |
| `ref` | `path` or `path#region` (for QA count) |

Errors: `file not found`, `region not found`, `region not closed`, each naming chapter and `ref`.

## FontSet

From `assets/fonts-manifest.json`; contract in [contracts/font-manifest.md](./contracts/font-manifest.md).

| Field | Rule |
|---|---|
| `id` | `my-sans`, `my-serif`, `en-sans`, `en-serif` |
| `language`, `style` | derived from `id` |
| `bodyFamily`, `monoFamily` | CSS family names |
| `faces` | seven entries: role, file, weight, italic, sha256 |
| `licence` | file name + sha256 |

State (per cache directory): **absent** → `book-build fonts` → **verified**. A run that needs
fonts and finds any file absent stops with the `book-build fonts` command (FR-042).

## InitRequest

| Field | Rule |
|---|---|
| `dir` | target directory (default `.`) |
| `language` | `my`/`mm`/`Myanmar` → `my`; `en`/`English` → `en` (case-insensitive) |
| `fontSet` | `sans` (default) or `serif` |
| `title`, `author` | required; prompted in a TTY, else flags |

Writes `book.json` and `chapters/chapter-01.md`; any existing target file → stop, write nothing.
Derived: `output_name` = title slug (`a-z0-9`, hyphen-joined) or `book`; `strings.licence_text`
= MIT licence line; `identifier` = `urn:uuid:<random>`; `year` = current year.
