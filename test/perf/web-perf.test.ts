import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../src/config/load.ts";
import { buildWeb } from "../../src/web/build.ts";
import { FIXTURE_MANIFEST } from "../helpers/fonts.ts";
import { PNG_1X1, tempDir } from "../helpers/temp.ts";
import { fixtureFontCache } from "../helpers/web.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

describe("web build performance (SC-006)", () => {
  it("builds a 20-chapter book in under 30 seconds", { timeout: 60_000 }, async () => {
    const body = [
      "## Section",
      "ဤစာပိုဒ်သည် စမ်းသပ်ရန် ဖြစ်သည်။ Some English words too. ".repeat(20),
      "```ts\nconst answer: number = 42; // the answer\n```",
      "```console\n$ node --version\nv26.10.0\n```",
      "> [!NOTE]\n> A note.",
    ].join("\n\n");
    const files: Record<string, string | Uint8Array> = {
      "cover.png": PNG_1X1,
      "back.png": PNG_1X1,
    };
    const names: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const name = `chapter-${String(i).padStart(2, "0")}.md`;
      names.push(name);
      files[`chapters/${name}`] =
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
      web_back_cover: "back.png",
      chapter_glob: "chapters/chapter-*.md",
      web_published_chapters: names,
    });
    const dir = tempDir(files);
    const { config } = await loadConfig(join(dir, "book.json"));
    const fontsDir = await fixtureFontCache(config);

    const started = performance.now();
    const { chapters } = await buildWeb(config, {
      out: join(tempDir(), "big"),
      fontsDir,
      manifestPath: FIXTURE_MANIFEST,
    });
    expect(chapters).toBe(20);
    expect(performance.now() - started).toBeLessThan(30_000);
  });
});
