import { PDFDict, PDFDocument, PDFName } from "pdf-lib";

const PAGE_WIDTH = (170 / 25.4) * 72;
const PAGE_HEIGHT = (240 / 25.4) * 72;

/**
 * Chromium rounds the page to 481.92 × 679.92 pt whatever size is asked for (research R-05):
 * set exactly 170 × 240 mm, anchored at the top edge where Chromium lays out, and drop the dates
 * so rebuilds are byte-identical (Constitution VII).
 */
export async function normalisePdf(bytes: Uint8Array): Promise<Uint8Array> {
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
