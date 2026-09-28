import { chmodSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPublishedChapters } from "../../../src/manuscript/chapters.ts";
import { BookError } from "../../../src/errors.ts";
import { testConfig } from "../../helpers/config.ts";
import { tempDir } from "../../helpers/temp.ts";

const chapters = {
  "chapters/chapter-01.md": "# Chapter 1 - One\n\nOne.\n",
  "chapters/chapter-02.md": "# Chapter 2 - Two\n\nTwo.\n",
  "chapters/chapter-07.md": "# Chapter 7 - Seven\n\nSeven.\n",
};

function book(list: unknown, files: Record<string, string> = chapters) {
  const dir = tempDir(files);
  return testConfig(dir, {
    language: "en",
    web_published_chapters: list as string[],
  });
}

async function error(list: unknown, files?: Record<string, string>): Promise<BookError> {
  const e: unknown = await loadPublishedChapters(book(list, files)).catch((x: unknown) => x);
  expect(e).toBeInstanceOf(BookError);
  return e as BookError;
}

describe("loadPublishedChapters", () => {
  it("loads only listed chapters, in file order", async () => {
    const loaded = await loadPublishedChapters(book(["chapter-02.md", "chapter-01.md"]));
    expect(loaded.map((c) => c.title)).toEqual(["One", "Two"]);
  });

  it("takes the slug from the chapter number", async () => {
    const [seven] = await loadPublishedChapters(book(["chapter-07.md"]));
    expect(seven).toMatchObject({ index: 7, slug: "ch07", number: 7 });
  });

  it("never opens an unlisted chapter", async () => {
    const config = book(["chapter-01.md"]);
    chmodSync(join(config.configDir, "chapters", "chapter-02.md"), 0o000);
    await expect(loadPublishedChapters(config)).resolves.toHaveLength(1);
  });

  it.each([undefined, [], ["x.md", 3]])("rejects a list that is %j", async (list) => {
    const e = await error(list);
    expect(e.subject).toBe("web_published_chapters");
    expect(e.reason).toBe("must be a non-empty list of chapter file names");
  });

  it.each(["../chapter-01.md", "sub/chapter-01.md", "chapter-01.txt", "chapter-01"])(
    "rejects %s as not a chapter file name",
    async (name) => {
      const e = await error([name]);
      expect(e.subject).toBe(name);
      expect(e.reason).toBe("published chapter must be a chapter file name");
    },
  );

  it("rejects a missing file", async () => {
    expect((await error(["chapter-09.md"])).reason).toBe("published chapter not found");
  });

  it("rejects a duplicate entry", async () => {
    expect((await error(["chapter-01.md", "chapter-01.md"])).reason).toBe(
      "duplicate published chapter",
    );
  });

  it("rejects two files with the same chapter number", async () => {
    const e = await error(["chapter-01.md", "chapter-01b.md"], {
      ...chapters,
      "chapters/chapter-01b.md": "# Chapter 1 - Again\n",
    });
    expect(e).toMatchObject({
      subject: "web_published_chapters",
      reason: "published chapters contain duplicate chapter numbers",
    });
  });
});
