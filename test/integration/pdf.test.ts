import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadBook } from "../../src/book/load.ts";
import type { BookConfig } from "../../src/config/load.ts";
import { loadConfig } from "../../src/config/load.ts";
import { runCli } from "../../src/cli.ts";
import { BookError } from "../../src/errors.ts";
import { getFontSet, loadManifest } from "../../src/fonts/manifest.ts";
import { buildPdf } from "../../src/pdf/build.ts";
import { pdfFacts, type PdfFacts } from "../../src/qa/pdf-read.ts";
import { bookEn, bookMm } from "../helpers/fixture-config.ts";
import { PRINT_MANIFEST } from "../helpers/fonts.ts";
import { hashTree } from "../helpers/hash.ts";
import { fixture, tempDir } from "../helpers/temp.ts";
import { fixtureFontCache } from "../helpers/web.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

const hasPdftotext = (() => {
  try {
    execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

async function build(config: BookConfig, options: { printed?: boolean; out?: string } = {}) {
  const fontsDir = await fixtureFontCache(config, true);
  const out = options.out ?? join(tempDir(), "book");
  const { file } = await buildPdf(await loadBook(config), {
    out,
    printed: options.printed ?? false,
    fontsDir,
    manifestPath: PRINT_MANIFEST,
  });
  return { out, file, facts: await pdfFacts(file) };
}

/** A copy of a fixture book whose config gets `patch`. */
async function patched(name: string, patch: Record<string, unknown>): Promise<BookConfig> {
  const dir = join(tempDir(), name);
  cpSync(fixture(name), dir, { recursive: true });
  cpSync(fixture("code"), join(dir, "..", "code"), { recursive: true });
  const path = join(dir, "book.json");
  writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, "utf8")), ...patch }));
  return (await loadConfig(path)).config;
}

const isFolio = (line: string | undefined) => /^\d+$/.test(line?.trim() ?? "");

/** Page number (1-based) where each chapter opens: its label line directly above its title. */
function openings(facts: PdfFacts, book: Awaited<ReturnType<typeof loadBook>>): number[] {
  return book.chapters.map((ch) => {
    const page = facts.lines.findIndex((lines) =>
      lines
        .slice(0, 6)
        .some((line, i) => line.trim() === ch.label && lines[i + 1]?.trim() === ch.title),
    );
    return page + 1;
  });
}

describe("buildPdf (screen edition)", { timeout: 120_000 }, () => {
  it("writes the 170 × 240 mm PDF and keeps the print document in src/", async () => {
    const config = await bookMm();
    const { out, file } = await build(config);
    expect(file).toBe(join(out, "book-mm-170x240.pdf"));
    expect(readFileSync(join(out, "src", "book-print.html"), "utf8")).toContain(
      '<div class="cover-page">',
    );
    const doc = await PDFDocument.load(readFileSync(file));
    for (const page of doc.getPages()) {
      const { width, height } = page.getMediaBox();
      expect([width, height].map((v) => Math.round(((v * 25.4) / 72) * 10) / 10)).toEqual([
        170, 240,
      ]);
    }
    expect(readdirSync(out).filter((name) => name.endsWith(".pdf"))).toEqual([
      "book-mm-170x240.pdf",
    ]);
  });

  it("lays out cover, front matter, contents with real page numbers, headers and folios", async () => {
    const config = { ...(await bookMm()), recto_chapter_start: true };
    const book = await loadBook(config);
    const { facts } = await build(config);
    const pages = facts.lines;
    expect(pages[0]).toEqual([]); // the cover image only
    expect(pages[1]).toContain(config.title); // title page, no header or folio
    expect(isFolio(pages[1]!.at(-1))).toBe(false);

    const opens = openings(facts, book);
    expect(opens.every((page) => page > 0)).toBe(true);
    for (const [i, ch] of book.chapters.entries()) {
      const entry = pages.flat().find((line) => line.startsWith(ch.fullTitle));
      expect(entry, ch.fullTitle).toBeDefined();
      expect(Number(entry!.slice(ch.fullTitle.length).trim())).toBe(opens[i]);
      expect(opens[i]! % 2).toBe(1); // recto start: a right-hand page
      const opening = pages[opens[i]! - 1]!;
      expect(opening[0]!.trim()).toBe(ch.label); // no running header
      expect(isFolio(opening.at(-1))).toBe(false); // no folio
    }

    for (const [index, lines] of pages.entries()) {
      const n = index + 1;
      const chapter = [...opens.keys()].filter((i) => opens[i]! <= n).at(-1);
      if (lines.length === 0 || n <= 4 || opens.includes(n) || chapter === undefined) continue;
      if (lines.length === 1 && !isFolio(lines[0])) continue; // the end image page has no text
      expect(lines.at(-1)!.trim(), `folio on page ${n}`).toBe(String(n));
      const header = n % 2 === 0 ? config.title : book.chapters[chapter]!.title;
      expect(lines[0]!.trim(), `header on page ${n}`).toBe(header);
    }
  });

  it("drops both running headers with running_headers: false, keeping the folios", async () => {
    const config = await patched("book-mm", { running_headers: false });
    const book = await loadBook(config);
    const { facts } = await build(config);
    const titles = new Set([config.title, ...book.chapters.map((ch) => ch.title)]);
    const opens = openings(facts, book);
    for (const [index, lines] of facts.lines.entries()) {
      if (index < 4 || opens.includes(index + 1) || lines.length === 0) continue;
      expect(titles.has(lines[0]!.trim()), `header on page ${index + 1}`).toBe(false);
    }
    expect(facts.lines.some((lines) => isFolio(lines.at(-1)))).toBe(true);
  });

  it("extracts clean text in both languages", async () => {
    for (const configFn of [bookMm, bookEn]) {
      const { facts } = await build(await configFn());
      for (const bad of [0x0000, 0xfffd]) {
        expect(facts.text).not.toContain(String.fromCharCode(bad));
      }
    }
  });

  it("embeds only the set's fonts when they cover the text (no system copies)", async () => {
    const config = await bookMm();
    const { facts } = await build(config);
    const set = getFontSet(await loadManifest(PRINT_MANIFEST), config.language, config.font_set);
    const allowed = new Set(set.faces.map((face) => face.file.replace(/\.ttf$/, "")));
    expect(facts.fonts.length).toBeGreaterThan(0);
    for (const font of facts.fonts) {
      expect(allowed.has(font.replace(/^[A-Z]{6}\+/, "")), font).toBe(true);
    }
  });

  it("wraps a code line that is too long even at 6 pt inside the text block", async () => {
    const config = await patched("book-mm", {});
    const chapter = join(config.chapter_glob.replace("chapter-*.md", "chapter-02.md"));
    const long = "x".repeat(260);
    writeFileSync(chapter, `${readFileSync(chapter, "utf8")}\n\`\`\`text\n${long}\n\`\`\`\n`);
    const { facts } = await build(config);
    const text = facts.lines.flat().join("");
    expect(text.replace(/[^x]/g, "").length).toBeGreaterThanOrEqual(260);
    expect(facts.lines.flat().some((line) => line.includes(long))).toBe(false); // wrapped
  });

  it("rebuilds byte-identically and leaves the sources untouched", async () => {
    const before = hashTree(fixture());
    const config = await bookMm();
    const first = await build(config);
    const second = await build(config);
    expect(Buffer.compare(readFileSync(first.file), readFileSync(second.file))).toBe(0);
    expect(hashTree(fixture())).toEqual(before);
  });

  it.skipIf(!hasPdftotext)("extracts the same characters as pdftotext on every page", async () => {
    const { file, facts } = await build(await bookMm());
    const strip = (text: string) => [...text.replace(/[\s\u200b-]/gu, "")].sort().join("");
    for (const [index, lines] of facts.lines.entries()) {
      const n = String(index + 1);
      const reference = execFileSync("pdftotext", ["-f", n, "-l", n, file, "-"]).toString();
      expect(strip(lines.join("")), `page ${n}`).toBe(strip(reference));
    }
  });

  it("runs as md2book build pdf [--printed] and reports the end image", async () => {
    const config = await bookMm();
    vi.stubEnv("MD2BOOK_FONTS", await fixtureFontCache(config, true));
    const out = join(tempDir(), "book");
    for (const [flags, name] of [
      [[], "book-mm-170x240.pdf"],
      [["--printed"], "book-mm-170x240-printed.pdf"],
    ] as const) {
      const lines: string[] = [];
      const argv = ["build", "pdf", "--config", fixture("book-mm", "book.json"), "--out", out];
      const code = await runCli([...argv, ...flags], {
        stdout: (s) => lines.push(s),
        stderr: (s) => lines.push(s),
        manifestPath: PRINT_MANIFEST,
      });
      expect(code).toBe(0);
      expect(lines.join("")).toBe(`End image: included\nPDF written: ${join(out, name)}\n`);
    }
    vi.unstubAllEnvs();
  });

  it("stops with the fonts command when the font set is missing", async () => {
    const config = await bookMm();
    const error = await buildPdf(await loadBook(config), {
      out: tempDir(),
      printed: false,
      fontsDir: tempDir(),
      manifestPath: PRINT_MANIFEST,
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BookError);
    expect((error as BookError).reason).toContain("run: md2book fonts --config");
  });

  it("leaves no PDF behind when rendering fails", async () => {
    const config = await bookMm();
    const fontsDir = await fixtureFontCache(config, true);
    const out = join(tempDir(), "book");
    await expect(
      buildPdf(await loadBook(config), {
        out,
        printed: false,
        fontsDir,
        manifestPath: PRINT_MANIFEST,
        launch: () => Promise.reject(new Error("no browser")),
      }),
    ).rejects.toThrow(BookError);
    expect(existsSync(out) ? readdirSync(out).filter((name) => name.includes(".pdf")) : []).toEqual(
      [],
    );
  });
});

/** The largest colour-channel spread of any pixel on each page, rendered at 72 dpi. */
async function colourSpread(file: string): Promise<number[]> {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise;
  const spreads: number[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");
    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise;
    const { data } = context.getImageData(0, 0, viewport.width, viewport.height);
    let spread = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i]!, data[i + 1]!, data[i + 2]!];
      spread = Math.max(spread, Math.max(r, g, b) - Math.min(r, g, b));
    }
    spreads.push(spread);
  }
  return spreads;
}

describe("buildPdf (printed edition)", { timeout: 120_000 }, () => {
  it("writes the print-shop interior: no cover, title page first, same contents numbering", async () => {
    const config = await patched("book-mm", { recto_chapter_start: true });
    const book = await loadBook(config);
    const { out, file, facts } = await build(config, { printed: true });
    expect(file).toBe(join(out, "book-mm-170x240-printed.pdf"));
    expect(readFileSync(join(out, "src", "book-printed.html"), "utf8")).not.toContain("cover-page");
    expect(facts.lines[0]).toEqual([config.title, config.author]);
    const opens = openings(facts, book);
    for (const [i, ch] of book.chapters.entries()) {
      const entry = facts.lines.flat().find((line) => line.startsWith(ch.fullTitle));
      expect(Number(entry!.slice(ch.fullTitle.length).trim())).toBe(opens[i]);
      expect(opens[i]! % 2).toBe(1);
    }
    for (const bad of [0x0000, 0xfffd]) expect(facts.text).not.toContain(String.fromCharCode(bad));
  });

  it("uses no colour: every page is greyscale (SC-004)", async () => {
    // Without the end image, whose picture is the only colour allowed.
    const config = await patched("book-mm", { end_image: undefined });
    const { file } = await build(config, { printed: true });
    const spreads = await colourSpread(file);
    expect(
      spreads.every((spread) => spread <= 8),
      JSON.stringify(spreads),
    ).toBe(true);
  });

  it("differs from the screen edition, which has colour", async () => {
    const config = await patched("book-mm", { end_image: undefined });
    const { file } = await build(config);
    expect(Math.max(...(await colourSpread(file)))).toBeGreaterThan(8);
  });
});
