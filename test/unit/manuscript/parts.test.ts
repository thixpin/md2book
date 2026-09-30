import { describe, expect, it } from "vitest";
import { loadChapters } from "../../../src/manuscript/chapters.ts";
import { loadParts } from "../../../src/manuscript/parts.ts";
import { BookError } from "../../../src/errors.ts";
import { testConfig } from "../../helpers/config.ts";
import { tempDir } from "../../helpers/temp.ts";
import { join } from "node:path";

async function book(files: Record<string, string>, withParts = true) {
  const dir = tempDir(files);
  const config = testConfig(
    dir,
    withParts ? { part_glob: join(dir, "chapters", "part-*.md") } : {},
  );
  const chapters = await loadChapters(config);
  return { config, chapters };
}

const chapters3 = {
  "chapters/chapter-01.md": "# အခန်း (၁) - One\n",
  "chapters/chapter-02.md": "# အခန်း (၂) - Two\n",
  "chapters/chapter-03.md": "# အခန်း (၃) - Three\n",
};

describe("loadParts", () => {
  it("returns no parts without a part glob", async () => {
    const { config, chapters } = await book(chapters3, false);
    expect(await loadParts(config, chapters)).toEqual([]);
  });

  it("assigns each chapter to the first part whose range covers it", async () => {
    const { config, chapters } = await book({
      ...chapters3,
      "chapters/part-01.md": "# Part I - Basics\n\nchapters: 1-2\n",
      "chapters/part-02.md": "# Part II — More\nchapters: 2-3\n",
    });
    const parts = await loadParts(config, chapters);
    expect(parts.map((p) => [p.label, p.title, p.first, p.last])).toEqual([
      ["Part I", "Basics", 1, 2],
      ["Part II", "More", 2, 3],
    ]);
    expect(parts[0]?.chapters.map((c) => c.number)).toEqual([1, 2]);
    expect(parts[1]?.chapters.map((c) => c.number)).toEqual([3]);
  });

  it.each([
    ["missing heading", "chapters: 1-3\n"],
    ["missing range", "# Part I - Basics\n"],
  ])("stops on a part file with a %s, naming the file", async (_case, text) => {
    const { config, chapters } = await book({ ...chapters3, "chapters/part-01.md": text });
    const error: unknown = await loadParts(config, chapters).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BookError);
    expect((error as BookError).subject).toMatch(/part-01\.md$/);
  });

  it("stops when a chapter is not covered by any part, naming file and number", async () => {
    const { config, chapters } = await book({
      ...chapters3,
      "chapters/part-01.md": "# Part I - Basics\nchapters: 1-2\n",
    });
    const error: unknown = await loadParts(config, chapters).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BookError);
    expect((error as BookError).subject).toBe("chapter-03.md");
    expect((error as BookError).reason).toBe("chapter 3 is not covered by any part file");
  });
});
