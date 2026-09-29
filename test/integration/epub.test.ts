import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadBook } from "../../src/book/load.ts";
import { runCli } from "../../src/cli.ts";
import { buildEpub } from "../../src/epub/build.ts";
import { BookError } from "../../src/errors.ts";
import { bookEn, bookMm } from "../helpers/fixture-config.ts";
import { FIXTURE_MANIFEST } from "../helpers/fonts.ts";
import { hashTree } from "../helpers/hash.ts";
import { fixture, tempDir } from "../helpers/temp.ts";
import { fixtureFontCache } from "../helpers/web.ts";
import { readZip } from "../helpers/zip.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

const hasEpubcheck = (() => {
  try {
    execFileSync("epubcheck", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

async function build(configFn: typeof bookMm) {
  const config = await configFn();
  const fontsDir = await fixtureFontCache(config);
  const out = join(tempDir(), "book");
  const { file } = await buildEpub(await loadBook(config), {
    out,
    fontsDir,
    manifestPath: FIXTURE_MANIFEST,
  });
  return { config, out, file, fontsDir };
}

describe("buildEpub", { timeout: 60_000 }, () => {
  it("writes <output_name>.epub with mimetype first and stored, the rest deflated", async () => {
    const { file, out, config } = await build(bookMm);
    expect(file).toBe(join(out, `${config.output_name}.epub`));
    const entries = await readZip(file);
    expect(entries[0]).toMatchObject({ name: "mimetype", method: 0, extraLength: 0 });
    expect(entries[0]!.data.toString()).toBe("application/epub+zip");
    const rest = entries.slice(1);
    expect(rest.every((e) => e.method === 8)).toBe(true);
    const names = rest.map((e) => e.name);
    expect(names).toEqual([...names].sort());
    expect(names).toEqual(
      expect.arrayContaining([
        "META-INF/container.xml",
        "OEBPS/content.opf",
        "OEBPS/toc.ncx",
        "OEBPS/css/common.css",
        "OEBPS/css/epub.css",
        "OEBPS/fonts/NotoSansMyanmar-Regular.ttf",
        "OEBPS/images/cover.png",
        "OEBPS/text/ch01.xhtml",
      ]),
    );
    expect(names.filter((n) => n.startsWith("OEBPS/fonts/"))).toHaveLength(7);
    expect(existsSync(join(out, "src", "epub", "OEBPS", "content.opf"))).toBe(true);
  });

  it("rebuilds src/epub and carries no timestamp except dcterms:modified", async () => {
    const first = await build(bookMm);
    writeFileSync(join(first.out, "src", "epub", "stray.txt"), "x");
    const { file } = await buildEpub(await loadBook(first.config), {
      out: first.out,
      fontsDir: first.fontsDir,
      manifestPath: FIXTURE_MANIFEST,
    });
    expect(existsSync(join(first.out, "src", "epub", "stray.txt"))).toBe(false);
    const opf = readFileSync(join(first.out, "src", "epub", "OEBPS", "content.opf"), "utf8");
    expect(opf.match(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ/g)).toHaveLength(1);
    expect(existsSync(file)).toBe(true);
  });

  it("leaves every fixture source untouched", async () => {
    const before = hashTree(fixture());
    await build(bookMm);
    expect(hashTree(fixture())).toEqual(before);
  });

  it("stops with the fonts command when the font set is not cached", async () => {
    const config = await bookEn();
    const error: unknown = await buildEpub(await loadBook(config), {
      out: tempDir(),
      fontsDir: tempDir(),
      manifestPath: FIXTURE_MANIFEST,
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BookError);
    expect((error as BookError).reason).toContain("run: book-build fonts --config");
  });

  it("runs as book-build epub and reports the end image", async () => {
    const config = await bookMm();
    vi.stubEnv("MD2BOOK_FONTS", await fixtureFontCache(config));
    const out = join(tempDir(), "book");
    const lines: string[] = [];
    const code = await runCli(["epub", "--config", fixture("book-mm", "book.json"), "--out", out], {
      stdout: (s) => lines.push(s),
      stderr: (s) => lines.push(s),
      manifestPath: FIXTURE_MANIFEST,
    });
    expect(code).toBe(0);
    expect(lines.join("")).toBe(
      `End image: included\nEPUB written: ${join(out, "book-mm.epub")}\n`,
    );
    vi.unstubAllEnvs();
  });

  it.skipIf(!hasEpubcheck).each([
    ["book-mm", bookMm],
    ["book-en", bookEn],
  ])("passes epubcheck: %s", async (_name, configFn) => {
    const { file } = await build(configFn);
    const result = execFileSync("epubcheck", [file], { encoding: "utf8", stdio: "pipe" });
    expect(result).toMatch(/No errors or warnings detected|Messages: 0 fatals \/ 0 errors/);
  });
});
