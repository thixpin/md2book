import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { loadBook } from "../../src/book/load.ts";
import { loadConfig } from "../../src/config/load.ts";
import { buildEpub } from "../../src/epub/build.ts";
import { PRINT_MANIFEST } from "../helpers/fonts.ts";
import { tempDir } from "../helpers/temp.ts";
import { fixtureFontCache } from "../helpers/web.ts";

const DEMO = new URL("../../examples/demo-book/book.json", import.meta.url).pathname;

// Spec 005 User Story 4: the demo book shows every manuscript format and builds.
describe("examples/demo-book", { timeout: 120_000 }, () => {
  it("shows every manuscript format between its chapters", async () => {
    const { config } = await loadConfig(DEMO);
    const book = await loadBook(config);
    expect(book.chapters).toHaveLength(3);
    expect(book.parts.map((part) => part.chapters.length)).toEqual([2, 1]);
    expect(book.chapters.flatMap((ch) => ch.includes ?? []).map((i) => i.ref)).toEqual([
      "hello.py#greet",
      "collections_demo.py#fruits",
      "collections_demo.py#prices",
    ]);
    const html = book.chapters.map((ch) => ch.html).join("");
    for (const marker of [
      "<h2",
      "<h3",
      "<h4",
      "<em>",
      "<strong>",
      "<code>",
      "<ul>",
      "<ol>",
      "<table>",
      "<hr",
      'class="terminal"',
      "language-python",
      "callout-note",
      "callout-warning",
      "callout-try",
    ]) {
      expect(html, marker).toContain(marker);
    }
    expect(html).toMatch(/[\u1000-\u109f]/u);
    expect(config.end_image_after).toBe("chapter-03.md");
    expect(config.web_published_chapters).toEqual(["chapter-01.md", "chapter-02.md"]);
  });

  it("builds its EPUB, with the end image gated in", async () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const { config } = await loadConfig(DEMO);
    const fontsDir = await fixtureFontCache(config, true);
    const { file } = await buildEpub(await loadBook(config), {
      out: join(tempDir(), "book"),
      fontsDir,
      manifestPath: PRINT_MANIFEST,
    });
    expect(file.endsWith("python.epub")).toBe(true);
    vi.unstubAllEnvs();
  });
});
