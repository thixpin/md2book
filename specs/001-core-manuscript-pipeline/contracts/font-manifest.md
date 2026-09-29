# Contract: font set manifest (`assets/fonts-manifest.json`)

Shipped inside the package; written by `scripts/build-fonts.py` when a font release is made.
The tool trusts only files whose SHA-256 matches this manifest.

```json
{
  "version": 1,
  "release": "fonts-v1",
  "base_url": "https://github.com/thixpin/md2book/releases/download/fonts-v1/",
  "sets": {
    "my-sans": {
      "language": "my",
      "style": "sans",
      "body_family": "Noto Sans Myanmar",
      "mono_family": "Noto Sans Mono",
      "faces": [
        {
          "role": "body-regular",
          "file": "NotoSansMyanmar-Regular.ttf",
          "weight": 400,
          "italic": false,
          "sha256": "<64 hex>"
        }
      ],
      "licence": { "file": "LICENSE-OFL.txt", "sha256": "<64 hex>" }
    }
  }
}
```

Rules:

- `sets` has exactly the keys `my-sans`, `my-serif`, `en-sans`, `en-serif`.
- Each set has seven `faces` with roles `body-regular`, `body-semibold`, `body-bold`,
  `body-italic`, `body-bolditalic`, `mono-regular`, `mono-bold`.
- `my-sans` lists exactly the seven file names of REF §7.
- Download URL of a file = `base_url` + `file` (or `MD2BOOK_FONTS_SOURCE` + `file`).
- The manifest is only ever the one shipped in the package; it is never read from
  `MD2BOOK_FONTS_SOURCE` or any download source, so a mirror must serve byte-identical files.
  (Tests inject a fixture manifest through an internal option that is not a CLI flag or
  environment variable.)
- Each set's `body_family` must equal the catalogue in `src/config/language.ts`, which supplies
  the `strings.typeface_line` default.
- A file may appear in several sets (e.g. mono faces); it is stored once per set directory.
- `base_url` points at the `fonts-v1` release of `thixpin/md2book`.
- `version` changes only on an incompatible shape change.
