// Spec 006 US3 (FR-010, SC-003, research R-08): each font family set shapes, embeds and
// extracts the Burmese fixture correctly; code stays in the monospace font (FR-012).
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadBook } from "../../src/book/load.ts";
import { loadConfig, type BookConfig } from "../../src/config/load.ts";
import { fontFamily } from "../../src/config/presets.ts";
import { runEpub } from "../../src/epub/command.ts";
import { configFontSet, loadManifest } from "../../src/fonts/manifest.ts";
import { buildPdf } from "../../src/pdf/build.ts";
import { fontCoverage } from "../../src/qa/coverage.ts";
import { pdfChecks } from "../../src/qa/pdf-checks.ts";
import { pdfFacts } from "../../src/qa/pdf-read.ts";
import { unicodeChecks } from "../../src/qa/unicode.ts";
import { PRINT_MANIFEST } from "../helpers/fonts.ts";
import { fixture, tempDir } from "../helpers/temp.ts";
import { fixtureFontCache } from "../helpers/web.ts";
import { readZip } from "../helpers/zip.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

const FAMILIES = [
  ["noto-sans-myanmar", "NotoSansMyanmar"],
  ["padauk", "Padauk"],
  ["masterpiece-uni-round", "MasterpieceUniRound"],
] as const;

// Shaped clusters that must come back out of the PDF exactly as typed.
const SAMPLES = [
  "ကျ ကြ ကွ ကှ ချွေး မြွေ လျှော့ ကျွန်ုပ်",
  "ကာ ကါ ကိ ကီ ကု ကူ ကေ ကဲ ကော ကော် ကံ ကး ကို့",
  "မန္တလေး ဗုဒ္ဓ ပစ္စည်း ကမ္ဘာ သမ္မတ ဥက္ကဋ္ဌ",
  "သင်္ချိုင်း မင်္ဂလာပါ အင်္ဂလိပ် သင်္ကြန်",
  "၀၁၂၃၄၅၆၇၈၉",
  "The quick brown fox jumps over the lazy dog 0123456789.",
];

async function config(family: string): Promise<BookConfig> {
  const loaded = (await loadConfig(fixture("book-fonts", "book.json"))).config;
  const chosen = fontFamily(family)!;
  return { ...loaded, font: { ...loaded.font, family, setId: chosen.setId } };
}

/** For each text item, the embedded font (base name without the subset tag) that draws it. */
async function fontsByText(file: string): Promise<Map<string, string>> {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise;
  const byText = new Map<string, string>();
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    await page.getOperatorList();
    for (const item of (await page.getTextContent()).items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const font = page.commonObjs.get(item.fontName) as { name?: string };
      byText.set(item.str, (font.name ?? "").replace(/^[A-Z]{6}\+/, ""));
    }
  }
  return byText;
}

describe("PDF: font families", { timeout: 300_000 }, () => {
  for (const [family, postscript] of FAMILIES) {
    it(`sets the Burmese fixture in ${family}`, async () => {
      const book = await config(family);
      const fontsDir = await fixtureFontCache(book, true);
      const loaded = await loadBook(book);
      const { file } = await buildPdf(loaded, {
        out: join(tempDir(), "book"),
        printed: false,
        fontsDir,
        manifestPath: PRINT_MANIFEST,
      });

      const facts = await pdfFacts(file);
      expect(facts.fonts.some((name) => name.includes(postscript))).toBe(true);
      expect(facts.fonts.some((name) => name.includes("NotoSansMono"))).toBe(true);
      // Compared without whitespace: the extractor adds spaces where shaped runs leave gaps.
      const bare = (value: string) => value.replace(/\s+/g, "");
      for (const sample of SAMPLES) expect(bare(facts.text)).toContain(bare(sample));
      const checks = pdfChecks(facts, loaded.chapters, false);
      expect(checks.replacement).toBe(0);
      // No stray glyph-ID letters: every non-Burmese, non-ASCII character comes from the text.
      const source = readFileSync(fixture("book-fonts", "chapters", "chapter-01.md"), "utf8");
      for (const [char] of checks.stray) expect(source, `stray ${char}`).toContain(char);
      expect(checks.chapterStarts.size).toBe(1);

      // Code and terminal lines are drawn with the mono font whatever the family.
      const fonts = await fontsByText(file);
      const code = [...fonts].filter(
        ([str]) => str.includes("greeting") || str.includes("hello.py"),
      );
      expect(code.length).toBeGreaterThan(0);
      for (const [str, font] of code) expect(font, str).toContain("NotoSansMono");

      // The QA Burmese checks and typeface coverage pass.
      expect(await unicodeChecks(loaded.chapters)).toEqual([]);
      const set = configFontSet(await loadManifest(PRINT_MANIFEST), book);
      expect(fontCoverage(loaded.chapters, set, join(fontsDir, set.id)).outside).toEqual([]);
    });

    it(`embeds the ${family} set in the EPUB`, async () => {
      const book = await config(family);
      const fontsDir = await fixtureFontCache(book, true);
      const set = configFontSet(await loadManifest(PRINT_MANIFEST), book);
      vi.stubEnv("MD2BOOK_FONTS", fontsDir);
      const dir = tempDir();
      const bookJson = join(dir, "book.json");
      const raw = JSON.parse(readFileSync(fixture("book-fonts", "book.json"), "utf8")) as object;
      cpSync(fixture("book-fonts"), dir, { recursive: true });
      writeFileSync(bookJson, JSON.stringify({ ...raw, font: { family } }));
      const { file } = await runEpub({ config: bookJson, out: join(dir, "dist") }, PRINT_MANIFEST);
      const names = (await readZip(file)).map((entry) => entry.name);
      for (const face of set.faces) expect(names).toContain(`OEBPS/fonts/${face.file}`);
    });
  }
});
