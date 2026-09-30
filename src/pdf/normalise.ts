import { PDFDict, PDFDocument, PDFName } from "pdf-lib";

const PT_PER_MM = 72 / 25.4;

/**
 * Chromium rounds the page (481.92 × 679.92 pt for 170 × 240 mm; research R-05): set the page's
 * exact size (spec 006 page presets), anchored at the top edge where Chromium lays out, and drop the dates
 * so rebuilds are byte-identical (Constitution VII).
 */
export async function normalisePdf(
  bytes: Uint8Array,
  size: { width: number; height: number } = { width: 170, height: 240 },
): Promise<Uint8Array> {
  const PAGE_WIDTH = size.width * PT_PER_MM;
  const PAGE_HEIGHT = size.height * PT_PER_MM;
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  for (const page of doc.getPages()) {
    const { y, height } = page.getMediaBox();
    const bottom = y + height - PAGE_HEIGHT;
    page.setMediaBox(0, bottom, PAGE_WIDTH, PAGE_HEIGHT);
    page.setCropBox(0, bottom, PAGE_WIDTH, PAGE_HEIGHT);
  }
  const info = doc.context.lookup(doc.context.trailerInfo.Info, PDFDict);
  info.delete(PDFName.of("CreationDate"));
  info.delete(PDFName.of("ModDate"));
  doc.setProducer("md2book");
  doc.setCreator("md2book");
  return doc.save({ useObjectStreams: false });
}
