import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../../src/config/load.ts";
import { runAll } from "../../src/qa/command.ts";
import { PRINT_MANIFEST } from "../helpers/fonts.ts";
import { PNG_1X1, tempDir } from "../helpers/temp.ts";
import { fixtureFontCache } from "../helpers/web.ts";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("build all performance (spec 004 SC-005)", () => {
  it(
    "builds the PDF, EPUB, web edition and QA of a 20-chapter book in under 2 minutes",
    { timeout: 240_000 },
    async () => {
      const body = [
        "## အပိုင်း",
        "ဤစာပိုဒ်သည် စမ်းသပ်ရန် ဖြစ်သည်။ Some English words too. ".repeat(20),
        "```ts\nconst answer: number = 42; // the answer\nconsole.log(answer);\n```",
        "```console\n$ node --version\nv26.10.0\n```",
        "| ကော်လံ | တန်ဖိုး |\n|---|---:|\n| က | 1 |\n| ခ | 2 |",
        "> [!NOTE]\n> မှတ်ချက်။",
      ].join("\n\n");
      const digits = "၀၁၂၃၄၅၆၇၈၉";
      const files: Record<string, string | Uint8Array> = { "cover.png": PNG_1X1 };
      const names: string[] = [];
      for (let i = 1; i <= 20; i++) {
        const name = `chapter-${String(i).padStart(2, "0")}.md`;
        const label = [...String(i)].map((d) => digits[Number(d)]).join("");
        files[`chapters/${name}`] =
          `# အခန်း (${label}) - Chapter ${i}\n\n${Array(5).fill(body).join("\n\n")}\n`;
        names.push(name);
      }
      files["book.json"] = JSON.stringify({
        title: "စာအုပ်ကြီး",
        author: "A",
        year: "2026",
        language: "my",
        identifier: "urn:uuid:00000000-0000-4000-8000-000000000020",
        output_name: "big",
        cover: "cover.png",
        web_back_cover: "cover.png",
        chapter_glob: "chapters/chapter-*.md",
        recto_chapter_start: true,
        web_published_chapters: names,
      });
      const configPath = join(tempDir(files), "book.json");
      const config = (await loadConfig(configPath)).config;
      vi.stubEnv("MD2BOOK_FONTS", await fixtureFontCache(config, true));

      const started = performance.now();
      const result = await runAll(
        { config: configPath, out: join(tempDir(), "big") },
        PRINT_MANIFEST,
      );
      const seconds = (performance.now() - started) / 1000;
      expect(result.pdf).toMatch(/big-170x240\.pdf$/);
      expect(result.web).toBeDefined();
      expect(seconds).toBeLessThan(120);
    },
  );
});
