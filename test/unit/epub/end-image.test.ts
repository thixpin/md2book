import { describe, expect, it } from "vitest";
import { loadBook } from "../../../src/book/load.ts";
import { endImage } from "../../../src/epub/build.ts";
import { epubDocuments } from "../../../src/epub/documents.ts";
import { opfXml } from "../../../src/epub/package.ts";
import { bookMm } from "../../helpers/fixture-config.ts";

describe("end image gate", () => {
  it("is included, as backmatter after the chapters, when the gate chapter exists", async () => {
    const config = await bookMm();
    expect(endImage(config)).toEqual({ path: config.end_image, message: "End image: included" });
    const book = await loadBook(config);
    const docs = epubDocuments(book, "cover.png", "end.png");
    expect(docs.at(-1)?.id).toBe("endimage");
    const opf = opfXml(book, docs, {
      coverName: "cover.png",
      endName: "end.png",
      fontFiles: [],
      modified: new Date(0),
    });
    expect(opf).toContain('<item id="end-image" href="images/end.png" media-type="image/png"/>');
    expect(opf.indexOf('idref="ch02"')).toBeLessThan(opf.indexOf('idref="endimage"'));
  });

  it("is withheld, and says why, when the gate chapter does not exist", async () => {
    const config = { ...(await bookMm()), end_image_after: "chapter-09.md" };
    expect(endImage(config)).toEqual({
      message: "End image: withheld (chapter-09.md not in chapters/)",
    });
    const docs = epubDocuments(await loadBook(config), "cover.png", endImage(config).path);
    expect(docs.map((d) => d.id)).not.toContain("endimage");
    expect(docs.map((d) => d.content).join("")).not.toContain("end.png");
  });

  it("is absent without end_image", async () => {
    expect(endImage({ ...(await bookMm()), end_image: undefined })).toEqual({});
  });
});
