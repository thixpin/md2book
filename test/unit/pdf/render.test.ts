import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { BookError } from "../../../src/errors.ts";
import { pagedBundle } from "../../../src/pdf/paged.ts";
import { renderPdf, type ServedFile } from "../../../src/pdf/render.ts";
import { fixture } from "../../helpers/temp.ts";

// A handler that writes the font status onto the first page as it is laid out: the fonts must be
// loaded by the time Paged.js measures text (it also loads them itself, after the stylesheets).
const PROBE =
  "class Probe extends Paged.Handler { afterPageLayout(page) { if (window.probed) return; window.probed = true;" +
  " const note = document.createElement('p'); note.textContent = 'fonts ' + document.fonts.status;" +
  " page.querySelector('.pagedjs_area').appendChild(note); } } Paged.registerHandlers(Probe);";
const HEAD =
  "<script>window.PagedConfig = { auto: false };</script>" +
  '<script src="/pagedjs/paged.polyfill.js"></script>' +
  `<script>${PROBE}</script>` +
  '<link rel="stylesheet" href="/css/test.css">';
const CSS =
  '@font-face { font-family: "Probe"; src: url("/fonts/NotoSans-Regular.ttf"); }\n' +
  '@page { size: 170mm 240mm; margin: 20mm; }\nbody { font-family: "Probe"; }\n' +
  ".break { break-before: page; }\n";

function files(): Record<string, ServedFile> {
  return {
    "/pagedjs/paged.polyfill.js": { body: pagedBundle(), type: "text/javascript" },
    "/css/test.css": { body: CSS, type: "text/css" },
    "/fonts/NotoSans-Regular.ttf": {
      body: readFileSync(fixture("fonts-source", "NotoSans-Regular.ttf")),
      type: "font/ttf",
    },
  };
}

async function text(bytes: Uint8Array): Promise<string> {
  const doc = await getDocument({ data: bytes.slice() }).promise;
  let all = "";
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    all += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n";
  }
  return all;
}

describe("renderPdf", { timeout: 60_000 }, () => {
  it("lays out the served document with Paged.js after the fonts have loaded", async () => {
    const html = `<!DOCTYPE html><html><head>${HEAD}</head><body><p>One</p><p class="break">Two</p></body></html>`;
    const bytes = await renderPdf({ html, files: files() });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
    const extracted = await text(bytes);
    expect(extracted).toContain("fonts loaded");
    expect(extracted).toContain("Two");
  });

  it("stops when the layout does not finish in time", async () => {
    const html = `<!DOCTYPE html><html><head>${HEAD}</head><body>${"<p>x</p>".repeat(3000)}</body></html>`;
    await expect(renderPdf({ html, files: files(), timeoutMs: 1 })).rejects.toThrow(
      new BookError("pdf", "page layout did not finish"),
    );
  });

  it("fails on any request it does not serve", async () => {
    const html = `<!DOCTYPE html><html><head>${HEAD}</head><body><img src="/book/missing.png"></body></html>`;
    await expect(renderPdf({ html, files: files() })).rejects.toThrow(
      new BookError("pdf", "unexpected request /book/missing.png"),
    );
  });

  it("names the install command when Chromium is missing", async () => {
    const launch = () => Promise.reject(new Error("Executable doesn't exist"));
    await expect(renderPdf({ html: "<p>x</p>", files: {}, launch })).rejects.toThrow(
      new BookError("pdf", "Chromium is not installed; run: npx playwright install chromium"),
    );
  });
});
