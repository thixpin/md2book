import { XMLValidator } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { loadBook, type Book } from "../../../src/book/load.ts";
import { epubDocuments } from "../../../src/epub/documents.ts";
import { CONTAINER_XML, ncxXml, opfXml } from "../../../src/epub/package.ts";
import { bookMm } from "../../helpers/fixture-config.ts";

async function book(withParts: boolean): Promise<Book> {
  const b = await loadBook(await bookMm());
  return withParts ? b : { ...b, parts: [] };
}

describe("NCX", () => {
  it("has depth 1 and play orders 1..N without parts", async () => {
    const ncx = ncxXml(await book(false));
    expect(ncx).toContain('<meta name="dtb:depth" content="1"/>');
    expect(ncx).toContain('<navPoint id="npch01" playOrder="1">');
    expect(ncx).toContain('<navPoint id="npch02" playOrder="2">');
    expect(XMLValidator.validate(ncx)).toBe(true);
  });

  it("nests chapters in parts with depth 2 and shared play order", async () => {
    const ncx = ncxXml(await book(true));
    expect(ncx).toContain('<meta name="dtb:depth" content="2"/>');
    expect(ncx).toContain(
      '<navPoint id="nppart1" playOrder="1"><navLabel><text>Part I - အခြေခံ</text></navLabel>' +
        '<content src="text/ch01.xhtml"/><navPoint id="npch01" playOrder="1">',
    );
    expect(ncx).toContain('<navPoint id="npch02" playOrder="2">');
  });
});

describe("OPF", () => {
  it("writes metadata, manifest and spine like the reference", async () => {
    const b = await book(true);
    const docs = epubDocuments(b, "cover.png", "end.png");
    const opf = opfXml(b, docs, {
      coverName: "cover.png",
      endName: "end.png",
      fontFiles: ["B.ttf", "A.ttf"],
      modified: new Date(Date.UTC(2026, 8, 29, 1, 2, 3)),
    });
    expect(XMLValidator.validate(opf)).toBe(true);
    expect(
      opf.startsWith(
        '<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="my">\n',
      ),
    ).toBe(true);
    expect(opf).toContain(
      '<dc:identifier id="bookid">urn:uuid:00000000-0000-4000-8000-000000000001</dc:identifier>\n',
    );
    expect(opf).toContain("<dc:language>my</dc:language>\n<dc:date>2026</dc:date>\n");
    expect(opf).not.toContain("dc:publisher");
    expect(opf).toContain('<meta property="dcterms:modified">2026-09-29T01:02:03Z</meta>\n');
    const manifest = opf.split("<manifest>\n")[1]!.split("\n</manifest>")[0]!.split("\n");
    expect(manifest.slice(0, 6)).toEqual([
      '<item id="cover-image" href="images/cover.png" media-type="image/png" properties="cover-image"/>',
      '<item id="css-common" href="css/common.css" media-type="text/css"/>',
      '<item id="css-epub" href="css/epub.css" media-type="text/css"/>',
      '<item id="font-0" href="fonts/A.ttf" media-type="font/ttf"/>',
      '<item id="font-1" href="fonts/B.ttf" media-type="font/ttf"/>',
      '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    ]);
    expect(manifest).toContain(
      '<item id="end-image" href="images/end.png" media-type="image/png"/>',
    );
    expect(manifest).toContain(
      '<item id="nav" href="text/nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    );
    expect(opf).toContain(
      '<spine toc="ncx">\n<itemref idref="cover" linear="no"/>\n<itemref idref="titlepage"/>',
    );
  });

  it("adds the publisher only when set", async () => {
    const b = await book(false);
    const opf = opfXml(
      { ...b, config: { ...b.config, publisher: "P & Q" } },
      epubDocuments(b, "cover.png", undefined),
      {
        coverName: "cover.png",
        fontFiles: [],
        modified: new Date(0),
      },
    );
    expect(opf).toContain("<dc:publisher>P &amp; Q</dc:publisher>\n<dc:date>");
  });

  it("writes the container exactly", () => {
    expect(CONTAINER_XML).toBe(
      '<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
        '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>\n',
    );
  });
});
