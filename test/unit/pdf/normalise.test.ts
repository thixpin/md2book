import { PDFDocument, PDFName } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { normalisePdf } from "../../../src/pdf/normalise.ts";

// Chromium's output: 481.92 × 679.92 pt pages with dates and its own producer.
async function chromiumLike(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([481.92, 679.92]);
  doc.addPage([481.92, 679.92]);
  doc.setCreationDate(new Date("2026-09-29T04:14:23Z"));
  doc.setModificationDate(new Date("2026-09-29T04:14:23Z"));
  doc.setProducer("Skia/PDF m153");
  doc.setCreator("Chromium");
  return doc.save();
}

describe("normalisePdf", () => {
  it("sets every page to exactly 170 × 240 mm, anchored at the top edge", async () => {
    const doc = await PDFDocument.load(await normalisePdf(await chromiumLike()));
    for (const page of doc.getPages()) {
      for (const box of [page.getMediaBox(), page.getCropBox()]) {
        expect(box.x).toBe(0);
        expect(box.width).toBeCloseTo((170 / 25.4) * 72, 2);
        expect(box.height).toBeCloseTo((240 / 25.4) * 72, 2);
        expect(box.y + box.height).toBeCloseTo(679.92, 2);
      }
    }
  });

  it("removes the dates and names md2book as producer and creator", async () => {
    const doc = await PDFDocument.load(await normalisePdf(await chromiumLike()), {
      updateMetadata: false,
    });
    const info = doc.context.lookup(doc.context.trailerInfo.Info) as unknown as {
      has(key: PDFName): boolean;
    };
    expect(info.has(PDFName.of("CreationDate"))).toBe(false);
    expect(info.has(PDFName.of("ModDate"))).toBe(false);
    expect(doc.getProducer()).toBe("md2book");
    expect(doc.getCreator()).toBe("md2book");
  });

  it("is deterministic", async () => {
    const input = await chromiumLike();
    expect(Buffer.from(await normalisePdf(input))).toEqual(
      Buffer.from(await normalisePdf(input.slice())),
    );
  });
});
