// Help and version must not load the build-time dependencies (CLI startup time).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const HEAVY = [
  "playwright",
  "pdfjs-dist",
  "pdf-lib",
  "pagedjs",
  "sharp",
  "fontkit",
  "prismjs",
  "markdown-it",
  "unicode-name",
  "@napi-rs/canvas",
  "yazl",
  "yauzl",
  "fast-xml-parser",
];

function imports(args: string[]): { status: number | null; stdout: string; loaded: string[] } {
  const run = spawnSync(
    process.execPath,
    ["--import", "./test/helpers/trace-imports.mjs", "src/bin.ts", ...args],
    { cwd: ROOT, encoding: "utf8" },
  );
  const loaded = run.stderr
    .split("\n")
    .filter((line) => line.startsWith("import:"))
    .map((line) => line.slice("import:".length));
  return { status: run.status, stdout: run.stdout, loaded };
}

describe("CLI startup", { timeout: 30_000 }, () => {
  it.each([
    ["--help"],
    ["-h"],
    ["--version"],
    ["-v"],
    ["init", "--help"],
    ["build", "pdf", "-h"],
    ["deploy", "github-pages", "-h"],
  ])("%j loads no build-time dependency", (...args) => {
    const { status, stdout, loaded } = imports(args);
    expect(status).toBe(0);
    expect(stdout).not.toBe("");
    expect(loaded.length).toBeGreaterThan(0);
    expect(
      loaded.filter((specifier) =>
        HEAVY.some((dep) => specifier === dep || specifier.startsWith(`${dep}/`)),
      ),
    ).toEqual([]);
  });
});
