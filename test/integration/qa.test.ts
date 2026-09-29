import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli.ts";
import { loadConfig } from "../../src/config/load.ts";
import { FIXTURE_MANIFEST } from "../helpers/fonts.ts";
import { hashTree } from "../helpers/hash.ts";
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
    manifestPath: FIXTURE_MANIFEST,
  });
  return { code, out: out.join("") };
}

const SECTIONS = [
  "## Manuscript",
  "## Unicode / Burmese text checks",
  "## Typeface coverage",
  "## PDF",
  "## EPUB",
  "## Metadata placeholders (must be filled before publication)",
  "## Known layout limitations",
  "## Content / continuity issues found but NOT changed",
];

describe("md2book qa", { timeout: 60_000 }, () => {
  it("writes QA-REPORT.md with the reference sections, without an em dash section", async () => {
    const configPath = fixture("book-qa", "book.json");
    vi.stubEnv("MD2BOOK_FONTS", await fixtureFontCache((await loadConfig(configPath)).config));
    const out = join(tempDir(), "qa");
    const before = hashTree(fixture());
    const result = await cli(["qa", "--config", configPath, "--out", out]);
    expect(result.code).toBe(0);
    expect(result.out).toContain(`QA report written: ${join(out, "QA-REPORT.md")}`);
    const report = readFileSync(join(out, "QA-REPORT.md"), "utf8");
    expect(report.startsWith("# QA Report: QA စမ်းသပ်\n\nGenerated: ")).toBe(true);
    expect(report.split("\n").filter((l) => l.startsWith("## "))).toEqual(SECTIONS);
    expect(report).not.toMatch(/em dash/i);
    expect(report).toContain(
      "- Chapters: 1\n- Chapter order: OK (files sorted, numbering 1..N matches labels)",
    );
    expect(report).toContain("| 1 | အခန်း (၁) | ပြဿနာများ | 0 |");
    expect(report).toContain("- chapter-01.md:25: HTML tag in manuscript");
    expect(report).toContain("## PDF\n\n- PDF not built.");
    expect(report).toContain("## EPUB\n\n- EPUB not built.");
    expect(report).toContain("- isbn: PLACEHOLDER-ISBN");
    expect(report.match(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/g)).toHaveLength(1);
    expect(hashTree(fixture())).toEqual(before);
  });

  it("md2book build all writes the PDF, the EPUB, the web edition and the report", async () => {
    const configPath = fixture("book-en", "book.json");
    vi.stubEnv("MD2BOOK_FONTS", await fixtureFontCache((await loadConfig(configPath)).config));
    const out = join(tempDir(), "all");
    const result = await cli(["build", "all", "--config", configPath, "--out", out]);
    expect(result.code).toBe(0);
    expect(result.out).toBe(
      `PDF written: ${join(out, "book-en-170x240.pdf")}\n` +
        `EPUB written: ${join(out, "book-en.epub")}\n` +
        `Web edition written: ${join(out, "web")} (2 published chapters)\n` +
        `QA report written: ${join(out, "QA-REPORT.md")}\n`,
    );
    expect(existsSync(join(out, "web", "index.html"))).toBe(true);
  });

  it("md2book build all skips the web edition when no chapters are published", async () => {
    const configPath = fixture("book-qa", "book.json");
    vi.stubEnv("MD2BOOK_FONTS", await fixtureFontCache((await loadConfig(configPath)).config));
    const out = join(tempDir(), "all");
    const result = await cli(["build", "all", "--config", configPath, "--out", out]);
    expect(result.code).toBe(0);
    expect(result.out).toContain("Web edition: skipped (web_published_chapters is not set)\n");
    expect(existsSync(join(out, "web"))).toBe(false);
    expect(existsSync(join(out, "QA-REPORT.md"))).toBe(true);
  });

  it("checks the EPUB after md2book build all", async () => {
    const configPath = fixture("book-mm", "book.json");
    vi.stubEnv("MD2BOOK_FONTS", await fixtureFontCache((await loadConfig(configPath)).config));
    const out = join(tempDir(), "all");
    const result = await cli(["build", "all", "--config", configPath, "--out", out]);
    expect(result.code).toBe(0);
    const report = readFileSync(join(out, "QA-REPORT.md"), "utf8");
    expect(report).toContain("- File: book-mm.epub");
    expect(report).toContain("- Reflowable: yes (no fixed-layout metadata)");
    expect(report).toContain("- Chapter documents: 2");
    expect(report).toContain("- Chapter text identical to manuscript render: yes");
    expect(report).toContain("- Structural errors: none");
    expect(report).toMatch(/- epubcheck: (PASS|NOT RUN)/);
    expect(report).toContain(
      "- Body text: Noto Sans Myanmar (Regular, Bold, Italic, Bold Italic).",
    );
    expect(report).not.toMatch(/Public-Instruction|author's convention|CLAUDE\.md/);
  });
});
