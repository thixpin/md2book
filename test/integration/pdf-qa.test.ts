import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli.ts";
import { PRINT_MANIFEST } from "../helpers/fonts.ts";
import { bookMm } from "../helpers/fixture-config.ts";
import { fixture, tempDir } from "../helpers/temp.ts";
import { fixtureFontCache } from "../helpers/web.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

async function cli(args: string[]) {
  const out: string[] = [];
  const code = await runCli(args, {
    stdout: (s) => out.push(s),
    stderr: (s) => out.push(s),
    manifestPath: PRINT_MANIFEST,
  });
  return { code, out: out.join("") };
}

const CONFIG = fixture("book-mm", "book.json");
const section = (report: string) => {
  const start = report.indexOf("## PDF");
  return report.slice(start, report.indexOf("\n## ", start + 3));
};

describe("QA of the PDF", { timeout: 180_000 }, () => {
  it("checks the screen PDF and writes the sample renders to qa-pages/", async () => {
    vi.stubEnv("MD2BOOK_FONTS", await fixtureFontCache(await bookMm(), true));
    const out = join(tempDir(), "book");
    expect((await cli(["build", "pdf", "--config", CONFIG, "--out", out])).code).toBe(0);
    const pages = join(out, "qa-pages");
    expect((await cli(["qa", "--config", CONFIG, "--out", out])).code).toBe(0);

    const pdf = section(readFileSync(join(out, "QA-REPORT.md"), "utf8"));
    expect(pdf).toContain("- File: book-mm-170x240.pdf");
    expect(pdf).toContain("- Edition: screen");
    expect(pdf).toContain("- Page size: 170.0 x 240.0 mm (target 170 x 240)");
    expect(pdf).toContain("- Chapter opening pages detected: 2 of 2");
    expect(pdf).toContain("- Text extraction check (copy/search): 0 replacement characters;");
    expect(pdf).toMatch(/- Fonts embedded: [A-Z]{6}\+NotoSansMyanmar-/);

    const samples = readdirSync(pages).sort();
    expect(samples[0]).toBe("page-001-cover.png");
    expect(samples).toContain("page-002-title.png");
    expect(samples.some((name) => name.endsWith("-ch01-open.png"))).toBe(true);
    expect(samples.at(-1)).toMatch(/^page-\d{3}-last-page\.png$/);
    expect(pdf).toContain(`- Sample renders in qa-pages/: ${samples.join(", ")}`);
    // 110 dpi of 170 mm is 736 pixels.
    expect((await sharp(join(pages, samples[0]!)).metadata()).width).toBe(736);

    // Rebuilt on every run: a stray file disappears.
    writeFileSync(join(pages, "stray.png"), "");
    expect((await cli(["qa", "--config", CONFIG, "--out", out])).code).toBe(0);
    expect(existsSync(join(pages, "stray.png"))).toBe(false);
  });

  it("checks the printed PDF with qa --printed", async () => {
    vi.stubEnv("MD2BOOK_FONTS", await fixtureFontCache(await bookMm(), true));
    const out = join(tempDir(), "book");
    const printed = ["--config", CONFIG, "--out", out, "--printed"];
    expect((await cli(["build", "pdf", ...printed])).code).toBe(0);
    expect((await cli(["qa", ...printed])).code).toBe(0);
    const pdf = section(readFileSync(join(out, "QA-REPORT.md"), "utf8"));
    expect(pdf).toContain("- File: book-mm-170x240-printed.pdf");
    expect(pdf).toContain("- Edition: printed (no cover page, black-and-white code)");
    const samples = readdirSync(join(out, "qa-pages"));
    expect(samples).toContain("page-001-title.png");
    expect(samples.some((name) => name.includes("cover"))).toBe(false);
  });

  it("build all builds the PDF, then the EPUB, the web edition and the report", async () => {
    vi.stubEnv("MD2BOOK_FONTS", await fixtureFontCache(await bookMm(), true));
    for (const flags of [[], ["--printed"]]) {
      const out = join(tempDir(), "book");
      const result = await cli(["build", "all", "--config", CONFIG, "--out", out, ...flags]);
      expect(result.code).toBe(0);
      const pdf = flags.length ? "book-mm-170x240-printed.pdf" : "book-mm-170x240.pdf";
      const written = result.out
        .split("\n")
        .filter((line) => / written: /.test(line))
        .map((line) => line.split(" written: ")[1]);
      expect(written).toEqual([
        join(out, pdf),
        join(out, "book-mm.epub"),
        `${join(out, "web")} (2 published chapters)`,
        join(out, "QA-REPORT.md"),
      ]);
      expect(section(readFileSync(join(out, "QA-REPORT.md"), "utf8"))).toContain(`- File: ${pdf}`);
    }
  });
});
