import { readFileSync } from "node:fs";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { pyRound } from "../web/images.ts";

export interface PdfFacts {
  pages: number;
  /** Width and height in mm, one decimal, of page min(5, n − 1) + 1 (qa.py). */
  sizeMm: [number, number];
  /** Embedded font names (BaseFont), sorted. */
  fonts: string[];
  /** Per page, the text lines from top to bottom. */
  lines: string[][];
  /** All pages' lines joined with newlines. */
  text: string;
}

const MM_PER_PT = 25.4 / 72;
const round1 = (value: number) => pyRound(value * 10) / 10;

/** Text of a PDF string body: UTF-16BE after a BOM, otherwise one byte per character. */
function pdfText(bytes: number[]): string {
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let out = "";
    for (let i = 2; i + 1 < bytes.length; i += 2)
      out += String.fromCharCode((bytes[i]! << 8) | bytes[i + 1]!);
    return out;
  }
  return String.fromCharCode(...bytes);
}

/** Bytes of a literal string body `(...)`, with its escapes resolved. */
function literalBytes(body: string): number[] {
  const ESCAPES: Record<string, number> = { n: 10, r: 13, t: 9, b: 8, f: 12 };
  const bytes: number[] = [];
  for (let i = 0; i < body.length; i++) {
    const c = body[i]!;
    if (c !== "\\") {
      bytes.push(c.charCodeAt(0) & 0xff);
      continue;
    }
    const next = body[++i] ?? "";
    const octal = /^[0-7]{1,3}/.exec(body.slice(i));
    if (octal) {
      bytes.push(parseInt(octal[0], 8) & 0xff);
      i += octal[0].length - 1;
    } else if (next in ESCAPES) {
      bytes.push(ESCAPES[next]!);
    } else if (next !== "\n") {
      bytes.push(next.charCodeAt(0) & 0xff);
    }
  }
  return bytes;
}

/** Per marked-content sequence of a page, in content-stream order: its ActualText or null. */
function actualTexts(doc: PDFDocument, index: number): (string | null)[] {
  const contents = doc.getPage(index).node.Contents();
  if (!contents) return [];
  const streams =
    contents instanceof PDFArray
      ? contents.asArray().map((ref) => doc.context.lookup(ref))
      : [contents];
  const source = streams
    .map((stream) =>
      Buffer.from(decodePDFRawStream(stream as PDFRawStream).decode()).toString("latin1"),
    )
    .join("\n");
  return [...source.matchAll(/\/[A-Za-z0-9_]+\s*(<<[\s\S]*?>>|\/[A-Za-z0-9_]+)?\s*BD?C\b/g)].map(
    (m) => {
      const props = m[1] ?? "";
      const hex = /\/ActualText\s*<([0-9A-Fa-f\s]*)>/.exec(props);
      if (hex)
        return pdfText((hex[1]!.replace(/\s/g, "").match(/../g) ?? []).map((h) => parseInt(h, 16)));
      const literal = /\/ActualText\s*\(((?:\\[\s\S]|[^\\)])*)\)/.exec(props);
      return literal ? pdfText(literalBytes(literal[1]!)) : null;
    },
  );
}

function fontNames(doc: PDFDocument): string[] {
  const names = new Set<string>();
  for (const page of doc.getPages()) {
    const fonts = page.node.Resources()?.lookupMaybe(PDFName.of("Font"), PDFDict);
    for (const [, ref] of fonts?.entries() ?? []) {
      const font = doc.context.lookup(ref, PDFDict);
      const base = font.get(PDFName.of("BaseFont"));
      if (base instanceof PDFName) names.add(base.decodeText());
    }
  }
  return [...names].sort();
}

/**
 * What QA reads back from a PDF (spec 004 research R-04). Chromium writes the characters of each
 * shaped cluster as ActualText; pdfjs ignores it, so the text of a marked-content span is its
 * ActualText (placed at its first glyph) and other text is pdfjs's. Items are grouped into lines
 * by baseline.
 */
export async function pdfFacts(file: string): Promise<PdfFacts> {
  const bytes = new Uint8Array(readFileSync(file));
  const lib = await PDFDocument.load(bytes, { updateMetadata: false });
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  const pdf = await task.promise;
  try {
    const lines: string[][] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const spans = actualTexts(lib, n - 1);
      const content = await (await pdf.getPage(n)).getTextContent({ includeMarkedContent: true });
      const pieces: { x: number; y: number; text: string }[] = [];
      let span = -1;
      let depth = 0;
      let actual: string | null = null;
      let placed = false;
      for (const item of content.items) {
        if ("type" in item) {
          if (item.type === "beginMarkedContent" || item.type === "beginMarkedContentProps") {
            span++;
            if (depth++ === 0) {
              actual = spans[span] ?? null;
              placed = false;
            }
          } else if (item.type === "endMarkedContent" && --depth === 0) {
            actual = null;
          }
          continue;
        }
        const [x, y] = [item.transform[4] as number, item.transform[5] as number];
        if (actual === null) {
          if (item.str) pieces.push({ x, y, text: item.str });
        } else if (!placed) {
          pieces.push({ x, y, text: actual });
          placed = true;
        }
      }
      const rows: { y: number; items: typeof pieces }[] = [];
      for (const piece of pieces) {
        const row = rows.find((r) => Math.abs(r.y - piece.y) < 2);
        if (row) row.items.push(piece);
        else rows.push({ y: piece.y, items: [piece] });
      }
      rows.sort((a, b) => b.y - a.y);
      lines.push(rows.map((row) => row.items.map((i) => i.text).join("")));
    }
    const sample = lib.getPage(Math.min(5, lib.getPageCount() - 1)).getMediaBox();
    return {
      pages: pdf.numPages,
      sizeMm: [round1(sample.width * MM_PER_PT), round1(sample.height * MM_PER_PT)],
      fonts: fontNames(lib),
      lines,
      text: lines.map((page) => page.join("\n")).join("\n"),
    };
  } finally {
    await task.destroy();
  }
}
