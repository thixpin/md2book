import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig, type BookConfig } from "../../src/config/load.ts";
import { checkCoverage } from "../../src/fonts/coverage.ts";
import { loadManifest } from "../../src/fonts/manifest.ts";
import { loadChapters } from "../../src/manuscript/chapters.ts";
import { loadParts } from "../../src/manuscript/parts.ts";
import { expandSnippets } from "../../src/manuscript/snippets.ts";
import { tocListHtml } from "../../src/manuscript/toc.ts";
import { renderChapter } from "../../src/markdown/render.ts";
import { FIXTURE_FONTS, FIXTURE_MANIFEST } from "../helpers/fonts.ts";
import { hashTree } from "../helpers/hash.ts";
import { PNG_1X1, fixture, tempDir } from "../helpers/temp.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

async function runPipeline(config: BookConfig) {
  const chapters = await loadChapters(config);
  const parts = await loadParts(config, chapters);
  for (const ch of chapters) {
    expandSnippets(ch, config.code_root);
    renderChapter(ch, config.strings);
  }
  const manifest = await loadManifest(FIXTURE_MANIFEST);
  const set = manifest.sets[`${config.language}-${config.font_set}`];
  const uncovered = checkCoverage(chapters, set, FIXTURE_FONTS);
  return { chapters, parts, uncovered, toc: tocListHtml(parts, chapters, "{slug}.xhtml") };
}

describe("core pipeline", () => {
  it("runs end to end on both fixture books and leaves every fixture file untouched", async () => {
    const before = hashTree(fixture());

    const mm = await runPipeline((await loadConfig(fixture("book-mm", "book.json"))).config);
    expect(mm.chapters).toHaveLength(2);
    expect(mm.parts[0]?.chapters).toHaveLength(2);
    expect(mm.toc).toContain('<ol class="toc-parts">');
    expect(mm.chapters[0]?.includes?.[0]?.ref).toBe("sample.ts#greet");
    expect(mm.chapters[0]?.html).toContain('<div class="terminal">');

    const en = await runPipeline((await loadConfig(fixture("book-en", "book.json"))).config);
    expect(en.chapters.map((c) => c.label)).toEqual(["Chapter 1", "Chapter 2", "Chapter 3"]);
    expect(en.uncovered.length).toBeGreaterThan(0);

    expect(hashTree(fixture())).toEqual(before);
  });

  it("loads and renders a 20-chapter book in under 10 seconds (SC-007)", async () => {
    const paragraph = "ဤစာပိုဒ်သည် စမ်းသပ်ရန် ဖြစ်သည်။ Some English words too. ".repeat(20);
    const body = [
      "## Section",
      paragraph,
      "```ts\nconst answer: number = 42; // the answer\n```",
      "```console\n$ node --version\nv26.10.0\n```",
      "> [!NOTE]\n> A note.",
      "| a | b |\n|---|---:|\n| 1 | 2 |",
    ].join("\n\n");
    const files: Record<string, string | Uint8Array> = { "cover.png": PNG_1X1 };
    for (let i = 1; i <= 20; i++) {
      const name = `chapters/chapter-${String(i).padStart(2, "0")}.md`;
      files[name] = `# Chapter ${i} - Chapter ${i}\n\n${Array(5).fill(body).join("\n\n")}\n`;
    }
    files["book.json"] = JSON.stringify({
      title: "Big",
      author: "A",
      year: "2026",
      language: "en",
      identifier: "urn:uuid:x",
      output_name: "big",
      cover: "cover.png",
      chapter_glob: "chapters/chapter-*.md",
    });
    const dir = tempDir(files);

    const started = performance.now();
    const { config } = await loadConfig(join(dir, "book.json"));
    const { chapters } = await runPipeline(config);
    expect(chapters).toHaveLength(20);
    expect(performance.now() - started).toBeLessThan(10_000);
  });
});
