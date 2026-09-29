import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli.ts";
import { runCover } from "../../src/cover/command.ts";
import { BookError } from "../../src/errors.ts";
import { fetchFontSet } from "../../src/fonts/fetch.ts";
import { fontSetById, loadManifest } from "../../src/fonts/manifest.ts";
import { PRINT_FONTS, PRINT_MANIFEST } from "../helpers/fonts.ts";
import { fixture, tempDir } from "../helpers/temp.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

/** A font cache with the given sets from the print fixture fonts; returns its root. */
async function fonts(...ids: string[]): Promise<string> {
  vi.stubEnv("MD2BOOK_FONTS_SOURCE", PRINT_FONTS);
  const root = tempDir();
  const manifest = await loadManifest(PRINT_MANIFEST);
  for (const id of ids) await fetchFontSet(fontSetById(manifest, id), { fontsDir: root, manifest });
  return root;
}

/** A copy of the cover fixture folder. */
function coverDir(): string {
  const dir = join(tempDir(), "cover");
  cpSync(fixture("cover"), dir, { recursive: true });
  return dir;
}

const size = async (file: string) => {
  const { width, height } = await sharp(file).metadata();
  return [width, height];
};

describe("md2book cover", { timeout: 120_000 }, () => {
  it("renders the page at 300 dpi to cover.png next to the HTML", async () => {
    const fontsDir = await fonts("my-sans");
    const dir = coverDir();
    const result = await runCover({ html: join(dir, "cover.html"), fontsDir }, PRINT_MANIFEST);
    expect(result).toEqual({ file: join(dir, "cover.png"), width: 2008, height: 2835 });
    expect(await size(result.file)).toEqual([2008, 2835]);
  });

  it("takes an output path and a resolution", async () => {
    const fontsDir = await fonts("my-sans");
    const dir = coverDir();
    const out = join(tempDir(), "out.png");
    await runCover(
      { html: join(dir, "cover.html"), output: out, dpi: 150, fontsDir },
      PRINT_MANIFEST,
    );
    expect(await size(out)).toEqual([1004, 1417]);
    expect(existsSync(join(dir, "cover.png"))).toBe(false);
  });

  it("draws Burmese with the set's fonts and renders the same bytes every time", async () => {
    const fontsDir = await fonts("my-sans", "en-sans");
    const dir = coverDir();
    const render = async (set: string, name: string) => {
      const output = join(tempDir(), name);
      await runCover({ html: join(dir, "cover.html"), output, set, fontsDir }, PRINT_MANIFEST);
      return readFileSync(output);
    };
    const first = await render("my-sans", "a.png");
    const again = await render("my-sans", "b.png");
    const english = await render("en-sans", "c.png"); // no Myanmar glyphs in the English set
    expect(Buffer.compare(first, again)).toBe(0);
    expect(Buffer.compare(first, english)).not.toBe(0);
  });

  it("stops when the cover is not exactly one page, writing nothing", async () => {
    const fontsDir = await fonts("my-sans");
    const dir = coverDir();
    const html = join(dir, "two-pages.html");
    await expect(runCover({ html, fontsDir }, PRINT_MANIFEST)).rejects.toThrow(
      new BookError(html, "expected 1 page, got 2"),
    );
    expect(readdirSync(dir).filter((name) => name.endsWith(".png"))).toEqual(["mark.png"]);
  });

  it("never loads anything from the network", async () => {
    const fontsDir = await fonts("my-sans");
    const dir = coverDir();
    const html = join(dir, "remote.html");
    writeFileSync(
      html,
      '<!doctype html><style>@page { size: 50mm 50mm; margin: 0 }</style><img src="https://example.com/x.png">',
    );
    await expect(runCover({ html, fontsDir }, PRINT_MANIFEST)).rejects.toThrow(
      new BookError("cover", "unexpected request https://example.com/x.png"),
    );
  });

  it("stops with the fonts command when the set is not cached", async () => {
    const dir = coverDir();
    const error = await runCover(
      { html: join(dir, "cover.html"), fontsDir: tempDir() },
      PRINT_MANIFEST,
    ).catch((e: unknown) => e);
    expect((error as BookError).reason).toContain("run: md2book fonts --set my-sans");
  });

  it("runs as md2book cover and checks its options", async () => {
    vi.stubEnv("MD2BOOK_FONTS", await fonts("my-sans"));
    const dir = coverDir();
    const io: string[] = [];
    const cli = (args: string[]) =>
      runCli(args, {
        stdout: (s) => io.push(s),
        stderr: (s) => io.push(s),
        manifestPath: PRINT_MANIFEST,
      });
    expect(await cli(["cover", join(dir, "cover.html")])).toBe(0);
    expect(io.join("")).toBe(
      `Cover written: ${join(dir, "cover.png")} (2008 x 2835 px, 300 dpi)\n`,
    );
    io.length = 0;
    expect(await cli(["cover", join(dir, "cover.html"), "--dpi", "0"])).toBe(1);
    expect(io.join("")).toBe("md2book: --dpi: not a resolution in dots per inch: 0\n");
    io.length = 0;
    const both = ["cover", join(dir, "cover.html"), "--set", "my-sans", "--config", "book.json"];
    expect(await cli(both)).toBe(1);
    expect(io.join("")).toBe("md2book: --set: give --config or --set, not both\n");
    io.length = 0;
    expect(await cli(["cover", join(dir, "missing.html")])).toBe(1);
    expect(io.join("")).toBe(`md2book: ${join(dir, "missing.html")}: cover HTML not found\n`);
  });
});
