# Contract: EPUB package

```text
mimetype                      "application/epub+zip", first entry, stored
META-INF/container.xml        rootfile OEBPS/content.opf
OEBPS/content.opf
OEBPS/toc.ncx
OEBPS/text/{cover,title,copyright,nav,chNN,end}.xhtml
OEBPS/css/common.css, OEBPS/css/epub.css
OEBPS/fonts/*.ttf             every face of the configured set
OEBPS/images/cover.<ext>, OEBPS/images/end.<ext> (when enabled)
```

All entries except `mimetype` deflated, added in sorted path order.

## container.xml

`<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>\n`

## content.opf (lines joined with `\n`)

```text
<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="{lang}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">{uid}</dc:identifier>
<dc:title>{title}</dc:title>
<dc:creator id="creator">{author}</dc:creator>
<dc:language>{lang}</dc:language>
<dc:publisher>{publisher}</dc:publisher>        (only when set)
<dc:date>{year}</dc:date>
<meta property="dcterms:modified">{YYYY-MM-DDTHH:MM:SSZ, UTC}</meta>
<meta name="cover" content="cover-image"/>
</metadata>
<manifest>
{items}
</manifest>
<spine toc="ncx">
{itemrefs}
</spine>
</package>
```

Manifest items in order: `cover-image` (`images/cover.<ext>`, `image/png|image/jpeg`,
`properties="cover-image"`), `css-common`, `css-epub`, `font-{i}` (`fonts/{file}`, `font/ttf`, files
sorted by name, i from 0), `ncx` (`toc.ncx`, `application/x-dtbncx+xml`), `end-image` when
enabled, then one item per document (`application/xhtml+xml`; `properties="nav"` on nav).
Spine: one `<itemref idref="{id}"/>` per document; the cover has `linear="no"`.

## toc.ncx

`<?xml version="1.0" encoding="utf-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="{uid}"/><meta name="dtb:depth" content="{1|2}"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head><docTitle><text>{title}</text></docTitle><navMap>{navPoints}</navMap></ncx>`

navPoint: `<navPoint id="{id}" playOrder="{n}"><navLabel><text>{label}</text></navLabel><content src="{src}"/>{inner}</navPoint>`.
Without parts: one `np{slug}` per chapter, playOrder 1…N. With parts: per part with chapters,
`nppart{part index}` (1-based file order) whose playOrder equals its first chapter's, src the first
chapter, containing that part's chapter navPoints (depth 2).
