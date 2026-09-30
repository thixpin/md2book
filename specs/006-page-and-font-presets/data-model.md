# Data Model: Page Size, Font Size and Font Family Presets

## Page size preset

| Id        | Width × height (mm) | File suffix | Wizard label              |
| --------- | ------------------- | ----------- | ------------------------- |
| `default` | 170 × 240           | `170x240`   | Default (170 × 240 mm)    |
| `a5`      | 148 × 210           | `148x210`   | A5 (148 × 210 mm)         |
| `b5`      | 176 × 250           | `176x250`   | B5 (176 × 250 mm)         |
| `a4`      | 210 × 297           | `210x297`   | A4 (210 × 297 mm)         |
| `letter`  | 215.9 × 279.4       | `216x279`   | Letter (216 × 279 mm)     |

Derived per preset: `sx = width / 170`, `sy = height / 240`, text-block width
`width − 42·sx` mm (128 mm for `default`). Validation: the id must be one of the five
(FR-001).

## Font size preset

| Id   | Factor | Wizard label       |
| ---- | ------ | ------------------ |
| `xs` | 0.85   | Extra Small        |
| `s`  | 0.92   | Small              |
| `m`  | 1      | Medium (default)   |
| `l`  | 1.1    | Large              |
| `xl` | 1.2    | Extra Large        |

Validation: the id must be one of the five (FR-005). Wizard order: Medium first, then
Extra Small, Small, Large, Extra Large (spec).

## Font family

| Family id               | Font set id       | Language | Body family name        | Faces (body)                | Wizard |
| ----------------------- | ----------------- | -------- | ----------------------- | --------------------------- | ------ |
| `noto-sans-myanmar`     | `my-sans`         | `my`     | Noto Sans Myanmar       | all five                    | yes, default |
| `padauk`                | `my-padauk`       | `my`     | Padauk                  | regular, semibold, bold     | yes, once verified |
| `masterpiece-uni-round` | `my-masterpiece`  | `my`     | Masterpiece Uni Round   | regular                     | yes, once verified |
| `noto-serif-myanmar`    | `my-serif`        | `my`     | Noto Serif Myanmar      | all five                    | no (config and `--font serif` only) |
| `noto-sans`             | `en-sans`         | `en`     | Noto Sans               | all five                    | yes (English), default |
| `noto-serif`            | `en-serif`        | `en`     | Noto Serif              | all five                    | yes (English) |

Every set also has `mono-regular` and `mono-bold` (Noto Sans Mono with Myanmar), shared by all
sets (FR-012), and a licence file. Excluded candidates (Myanmar Census, NamKhone Unicode) are not
ids (research R-06).

Validation (FR-015):

- `font.family` must be a known id; its language must equal the book's `language`.
- `font_set` (`sans`/`serif`) maps to `noto-sans-myanmar`/`noto-serif-myanmar` or
  `noto-sans`/`noto-serif` by language; when both keys are set they must name the same id.
- Resolution: `font.family` → else `font_set` → else the language's default family.

## Font set (manifest entry)

`assets/fonts-manifest.json`, `sets.<set id>`:

- `language`, `body_family`, `mono_family`, `licence { file, sha256 }` (unchanged).
- `style` is kept for the four Noto sets and absent for the new ones.
- `faces`: ordered by role; `body-regular`, `mono-regular`, `mono-bold` required;
  `body-semibold`, `body-bold`, `body-italic`, `body-bolditalic` optional (research R-07).
- Top level: `version` 1, `release` `fonts-v2`, `base_url` of that release.

## Book config additions

```json
{
  "page": { "size": "a5" },
  "font": { "family": "padauk", "size": "s" }
}
```

Both objects and all their keys are optional; unknown keys inside them warn like other unknown
keys. Loaded config gains resolved `page` (preset) and `font` (family id, set id, size preset).

## init answers

| Answer        | Source in a terminal                           | Flag              | Default                  |
| ------------- | ---------------------------------------------- | ----------------- | ------------------------ |
| mode          | list: Use default configuration / wizard       | (none; flags imply defaults) | default configuration |
| language      | list: Myanmar / English                        | `--lang`          | none (required)          |
| title, author | text                                           | `--title`, `--author` | none (required)      |
| page size     | wizard list                                    | `--page-size`     | `default`                |
| font family   | wizard list (families of the language)         | `--font-family` (or legacy `--font`) | language default |
| font size     | wizard list                                    | `--font-size`     | `m`                      |
| chapter folder| wizard: Default (chapters) / Custom → text     | `--chapters`      | `chapters`               |

Validation: the chapter folder is relative, inside the book folder, and not empty; no file is
overwritten (FR-021).
