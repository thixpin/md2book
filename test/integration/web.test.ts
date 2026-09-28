import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildWeb } from "../../src/web/build.ts";
import { BookError } from "../../src/errors.ts";
import { bookEn, bookMm } from "../helpers/fixture-config.ts";
import { FIXTURE_MANIFEST } from "../helpers/fonts.ts";
import { hashTree } from "../helpers/hash.ts";
import { fixture, tempDir } from "../helpers/temp.ts";
import { fixtureFontCache } from "../helpers/web.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
});

function tree(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name).slice(dir.length + 1))
    .sort();
}

async function build(configFn: typeof bookEn, out = join(tempDir(), "book")) {
  const config = await configFn();
  const fontsDir = await fixtureFontCache(config);
  const result = await buildWeb(config, { out, fontsDir, manifestPath: FIXTURE_MANIFEST });
  return { config, out, web: result.dir, fontsDir };
}

describe("buildWeb", { timeout: 60_000 }, () => {
  it("writes the site: pages, hashed assets, fonts, cover and back cover", async () => {
    const { web } = await build(bookEn);
    const files = tree(web);
    expect(files).toEqual(
      expect.arrayContaining([
        "404.html",
        "back-cover.png",
        "chapters/ch01.html",
        "chapters/ch02.html",
        "cover.png",
        "fonts/LICENSE-OFL.txt",
        "fonts/NotoSans-Regular.ttf",
        "fonts/NotoSansMono-Regular.ttf",
        "index.html",
        "og-image.png",
        "favicon.svg",
        "favicon-32.png",
        "apple-touch-icon.png",
      ]),
    );
    expect(files).toHaveLength(8 + 11); // 8 font files + the 11 other contract files
    expect(files.filter((f) => /^style\.[0-9a-f]{12}\.css$/.test(f))).toHaveLength(1);
    expect(files.filter((f) => /^reader\.[0-9a-f]{12}\.js$/.test(f))).toHaveLength(1);
    expect(files.filter((f) => f.startsWith("fonts/"))).toHaveLength(8);
  });

  it("never publishes an unlisted chapter", async () => {
    const { web } = await build(bookEn);
    for (const file of tree(web)) {
      expect(readFileSync(join(web, file)).includes("DRAFT-MARKER-3"), file).toBe(false);
    }
    expect(existsSync(join(web, "chapters", "ch03.html"))).toBe(false);
  });

  it("empties web/ before building and is deterministic", async () => {
    const first = await build(bookMm);
    const before = hashTree(first.web);
    writeFileSync(join(first.web, "stray.txt"), "x");
    await buildWeb(await bookMm(), {
      out: first.out,
      fontsDir: first.fontsDir,
      manifestPath: FIXTURE_MANIFEST,
    });
    expect(existsSync(join(first.web, "stray.txt"))).toBe(false);
    const after = hashTree(first.web);
    const stable = (h: Record<string, string>) =>
      Object.fromEntries(Object.entries(h).filter(([k]) => !k.endsWith(".png")));
    expect(stable(after)).toEqual(stable(before));
  });

  it("leaves every fixture source untouched", async () => {
    const before = hashTree(fixture());
    await build(bookMm);
    expect(hashTree(fixture())).toEqual(before);
  });

  it("stops with the fonts command when the font set is not cached", async () => {
    const config = await bookEn();
    const error: unknown = await buildWeb(config, {
      out: tempDir(),
      fontsDir: tempDir(),
      manifestPath: FIXTURE_MANIFEST,
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BookError);
    expect((error as BookError).reason).toContain("run: book-build fonts --config");
  });

  it("opens index at the book and chapter pages at their chapter", async () => {
    const { web } = await build(bookEn);
    expect(readFileSync(join(web, "index.html"), "utf8")).toContain('data-open-chapter=""');
    expect(readFileSync(join(web, "chapters", "ch02.html"), "utf8")).toContain(
      'data-open-chapter="ch02"',
    );
  });
});
