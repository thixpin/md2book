# Fonts

md2book typesets every edition with one of four curated font sets. The
book's `language` and `font_set` pick the set:

| Set        | `language` | `font_set` | Body family        | Covers          |
| ---------- | ---------- | ---------- | ------------------ | --------------- |
| `my-sans`  | `my`       | `sans`     | Noto Sans Myanmar  | Myanmar + Latin |
| `my-serif` | `my`       | `serif`    | Noto Serif Myanmar | Myanmar + Latin |
| `en-sans`  | `en`       | `sans`     | Noto Sans          | Latin           |
| `en-serif` | `en`       | `serif`    | Noto Serif         | Latin           |

Each set has regular, semibold, bold, italic and bold italic body faces,
plus Noto Sans Mono (with Myanmar) in regular and bold for code.

## Fetching

```console
$ md2book fonts
$ md2book fonts --set en-serif
```

`md2book fonts` downloads the set once, checks every file's SHA-256
against the manifest shipped in the package, and caches it. Files that
are already cached and intact are not downloaded again, so the command
is safe to rerun. After that, every command works offline.

A command that needs a set that is not cached stops and prints the
`md2book fonts` command to run.

## Cache

The cache root is the first of:

1. `--fonts <dir>`
2. `MD2BOOK_FONTS`
3. `$XDG_CACHE_HOME/md2book/fonts`
4. `~/.cache/md2book/fonts`

`--fonts` exists only on `fonts` and `cover`; the build commands find
the cache through `MD2BOOK_FONTS` or the defaults. Each set is kept in
its own folder under the root (`<root>/my-sans/`, …). Several books with
the same set share one download.

## Offline and mirrors

`MD2BOOK_FONTS_SOURCE` fetches the files from somewhere else: a mirror
URL, or a local folder holding the same files. The checksums are still
verified, so a mirror cannot change the fonts.

```console
$ MD2BOOK_FONTS_SOURCE=/media/usb/md2book-fonts md2book fonts
```

To prepare a machine without internet access, copy a filled cache root
to it and point `MD2BOOK_FONTS` at it.

## Environment variables

| Variable               | Meaning                                        |
| ---------------------- | ---------------------------------------------- |
| `MD2BOOK_FONTS`        | cache root                                     |
| `MD2BOOK_FONTS_SOURCE` | mirror URL or local folder with the same files |
| `XDG_CACHE_HOME`       | base of the default cache root                 |

## Licence

The fonts are licensed under the SIL Open Font License 1.1;
`LICENSE-OFL.txt` is installed next to them.
