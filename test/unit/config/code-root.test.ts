import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findCodeRoot } from "../../../src/config/code-root.ts";
import { tempDir } from "../../helpers/temp.ts";

describe("findCodeRoot", () => {
  it("returns the nearest ancestor with a .git directory", () => {
    const root = realpathSync(tempDir({ "repo/books/one/book.json": "{}" }));
    mkdirSync(join(root, "repo", ".git"));
    expect(findCodeRoot(join(root, "repo", "books", "one"))).toBe(join(root, "repo"));
  });

  it("accepts a .git file (worktree)", () => {
    const root = realpathSync(tempDir({ "wt/book/book.json": "{}" }));
    writeFileSync(join(root, "wt", ".git"), "gitdir: /elsewhere\n");
    expect(findCodeRoot(join(root, "wt", "book"))).toBe(join(root, "wt"));
  });

  it("falls back to the start directory when there is no .git", () => {
    const root = realpathSync(tempDir({ "plain/book.json": "{}" }));
    expect(findCodeRoot(join(root, "plain"))).toBe(join(root, "plain"));
  });
});
