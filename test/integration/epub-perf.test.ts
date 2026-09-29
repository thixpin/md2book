import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAll } from "../../src/qa/command.ts";
import { loadConfig } from "../../src/config/load.ts";
import { FIXTURE_MANIFEST } from "../helpers/fonts.ts";
import { PNG_1X1, tempDir } from "../helpers/temp.ts";
import { fixtureFontCache } from "../helpers/web.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("EPUB + QA performance (SC-005)", () => {
  it(
    "handles a 20-chapter book in under 60 seconds (epubcheck excluded)",
    { timeout: 120_000 },
    async () => {
      const body = [
        "## Section",
        "ဤစာပိုဒ်သည် စမ်းသပ်ရန် ဖြစ်သည်။ Some English words too. ".repeat(20),
        "```ts\nconst answer: number = 42; // the answer\n```",
        "```console\n$ node --version\nv26.10.0\n```",
        "> [!NOTE]\n> A note.",
      ].join("\n\n");
      const files: Record<string, string | Uint8Array> = { "cover.png": PNG_1X1 };
      for (let i = 1; i <= 20; i++) {
        files[`chapters/chapter-${String(i).padStart(2, "0")}.md`] =
          `# Chapter ${i} - Chapter ${i}\n\n${Array(5).fill(body).join("\n\n")}\n`;
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
      const configPath = join(tempDir(files), "book.json");
      vi.stubEnv("MD2BOOK_FONTS", await fixtureFontCache((await loadConfig(configPath)).config));
      vi.stubEnv("PATH", tempDir()); // no epubcheck: SC-005 excludes it

      const started = performance.now();
      await runAll({ config: configPath, out: join(tempDir(), "big") }, FIXTURE_MANIFEST);
      expect(performance.now() - started).toBeLessThan(60_000);
    },
  );
});
