import { describe, expect, it } from "vitest";
import { findFiles } from "../../../src/manuscript/text.ts";
import { tempDir } from "../../helpers/temp.ts";
import { join } from "node:path";

describe("findFiles", () => {
  it("matches like Python glob.glob: no dotfiles, no recursion, code-point order", async () => {
    const dir = tempDir({
      "chapters/chapter-02.md": "",
      "chapters/chapter-01.md": "",
      "chapters/.chapter-99.md": "",
      "chapters/sub/chapter-03.md": "",
      "chapters/part-01.md": "",
    });
    expect(await findFiles(join(dir, "chapters", "chapter-*.md"))).toEqual([
      join(dir, "chapters", "chapter-01.md"),
      join(dir, "chapters", "chapter-02.md"),
    ]);
    expect(await findFiles(join(dir, "chapters", "part-*.md"))).toEqual([
      join(dir, "chapters", "part-01.md"),
    ]);
  });
});
