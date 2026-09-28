import { readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli.ts";
import { FIXTURE_FONTS, FIXTURE_MANIFEST } from "../helpers/fonts.ts";
import { fixture, tempDir } from "../helpers/temp.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

function cli(args: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const run = runCli(args, {
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
    manifestPath: FIXTURE_MANIFEST,
  });
  return run.then((code) => ({ code, out: out.join(""), err: err.join("") }));
}

describe("book-build fonts", () => {
  it("fetches the config's font set and prints the cache directory", async () => {
    const root = tempDir();
    vi.stubEnv("MD2BOOK_FONTS_SOURCE", FIXTURE_FONTS);
    vi.stubEnv("MD2BOOK_FONTS", root);
    const result = await cli(["fonts", "--config", fixture("book-en", "book.json")]);
    expect(result).toMatchObject({ code: 0, err: "" });
    expect(result.out.trim()).toBe(join(root, "en-sans"));
    expect(readdirSync(join(root, "en-sans"))).toContain("NotoSans-Regular.ttf");
  });

  it("accepts --set and --fonts", async () => {
    const root = tempDir();
    vi.stubEnv("MD2BOOK_FONTS_SOURCE", FIXTURE_FONTS);
    const result = await cli(["fonts", "--set", "my-serif", "--fonts", root]);
    expect(result.code).toBe(0);
    expect(result.out.trim()).toBe(join(root, "my-serif"));
  });

  it("exits 1 with one line listing valid sets for an unknown set", async () => {
    const result = await cli(["fonts", "--set", "xx-sans"]);
    expect(result.code).toBe(1);
    expect(result.err).toBe(
      "book-build: xx-sans: unknown font set; valid sets: my-sans, my-serif, en-sans, en-serif\n",
    );
  });

  it("exits 1 when neither --config nor --set is given", async () => {
    const result = await cli(["fonts"]);
    expect(result.code).toBe(1);
    expect(result.err.trimEnd().split("\n")).toHaveLength(1);
  });
});
