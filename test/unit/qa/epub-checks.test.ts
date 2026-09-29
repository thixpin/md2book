import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import yazl from "yazl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadBook, type Book } from "../../../src/book/load.ts";
import { buildEpub } from "../../../src/epub/build.ts";
import { epubChecks, runEpubcheck } from "../../../src/qa/epub-checks.ts";
import { bookMm } from "../../helpers/fixture-config.ts";
import { FIXTURE_MANIFEST } from "../../helpers/fonts.ts";
import { tempDir } from "../../helpers/temp.ts";
import { fixtureFontCache } from "../../helpers/web.ts";
import { readZip } from "../../helpers/zip.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

async function built(): Promise<{ book: Book; file: string }> {
  const config = await bookMm();
  const book = await loadBook(config);
  const fontsDir = await fixtureFontCache(config);
  const { file } = await buildEpub(book, {
    out: join(tempDir(), "b"),
    fontsDir,
    manifestPath: FIXTURE_MANIFEST,
  });
  return { book, file };
}

/** Rewrites an EPUB with a change to its entries (order, compression or content). */
async function tamper(
  file: string,
  change: (entries: { name: string; data: Buffer; compress: boolean }[]) => void,
): Promise<string> {
  const entries = (await readZip(file)).map((e) => ({
    name: e.name,
    data: e.data,
    compress: e.method === 8,
  }));
  change(entries);
  const out = join(tempDir(), "tampered.epub");
  const zip = new yazl.ZipFile();
  for (const e of entries)
    zip.addBuffer(e.data, e.name, { compress: e.compress, forceDosTimestamp: true });
  zip.end();
  const { createWriteStream } = await import("node:fs");
  await new Promise<void>((r) => zip.outputStream.pipe(createWriteStream(out)).on("close", r));
  return out;
}

describe("epubChecks", { timeout: 60_000 }, () => {
  it("passes a freshly built EPUB", async () => {
    const { book, file } = await built();
    const result = await epubChecks(file, book.chapters);
    expect(result).toMatchObject({
      errors: [],
      fixedLayout: false,
      chapterDocs: 2,
      textMismatchChapters: [],
    });
    expect(result.fontsEmbedded).toHaveLength(7);
  });

  it("finds mimetype order and compression problems, broken XHTML, missing hrefs and text changes", async () => {
    const { book, file } = await built();
    const bad = await tamper(file, (entries) => {
      const mimetype = entries.shift()!;
      entries.push({ ...mimetype, compress: true });
      const ch = entries.find((e) => e.name === "OEBPS/text/ch01.xhtml")!;
      ch.data = Buffer.from(ch.data.toString().replace("</header>", "</header><p>extra text</p>"));
      const nav = entries.find((e) => e.name === "OEBPS/text/nav.xhtml")!;
      nav.data = Buffer.from(nav.data.toString().replace("</nav>", ""));
      const idx = entries.findIndex((e) => e.name === "OEBPS/css/epub.css");
      entries.splice(idx, 1);
    });
    const result = await epubChecks(bad, book.chapters);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "mimetype is not the first zip entry",
        "mimetype is compressed",
        "manifest href missing: css/epub.css",
      ]),
    );
    expect(
      result.errors.some((e) => e.startsWith("OEBPS/text/nav.xhtml: not well-formed XML")),
    ).toBe(true);
    expect(result.textMismatchChapters).toEqual(["ch01"]);
  });

  it("reports epubcheck as not run when it is not on PATH", async () => {
    vi.stubEnv("PATH", tempDir());
    expect(await runEpubcheck("x.epub")).toBeUndefined();
    vi.unstubAllEnvs();
  });

  it("runs a local epubcheck and keeps the last 4000 characters of its output", async () => {
    const bin = tempDir();
    mkdirSync(bin, { recursive: true });
    writeFileSync(
      join(bin, "epubcheck"),
      `#!/bin/sh\nprintf '%05000d' 0\necho FAILED >&2\nexit 1\n`,
      { mode: 0o755 },
    );
    vi.stubEnv("PATH", bin);
    const result = await runEpubcheck("x.epub");
    vi.unstubAllEnvs();
    expect(result?.passed).toBe(false);
    expect(result?.output).toHaveLength(4000);
    expect(result?.output.endsWith("FAILED")).toBe(true);
  });
});
