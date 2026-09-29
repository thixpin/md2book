import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROOT = new URL("../..", import.meta.url).pathname;

// Spec 005 FR-008: the published package holds the program, the carried assets, the docs and the
// licence, and nothing else (no tests, specs, scripts, examples, reference pack or font build).
const ALLOWED = [
  /^package\.json$/,
  /^README\.md$/,
  /^LICENSE$/,
  /^dist\/.+\.(js|d\.ts)$/,
  /^assets\/css\/[a-z-]+\.css$/,
  /^assets\/(web-reader|paged-handler)\.js$/,
  /^assets\/fonts-manifest\.json$/,
];

describe("published package", { timeout: 120_000 }, () => {
  it("contains exactly the program, assets, README, LICENSE and package.json", () => {
    execFileSync("npm", ["run", "-s", "build"], { cwd: ROOT, stdio: "pipe" });
    const [pack] = JSON.parse(
      execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
        cwd: ROOT,
        encoding: "utf8",
      }),
    ) as [{ name: string; version: string; files: { path: string }[] }];
    const files = pack.files.map((file) => file.path);
    expect(files.filter((file) => !ALLOWED.some((re) => re.test(file)))).toEqual([]);
    for (const needed of [
      "dist/bin.js",
      "dist/index.js",
      "dist/index.d.ts",
      "assets/css/print.css",
      "assets/web-reader.js",
      "assets/fonts-manifest.json",
      "README.md",
      "LICENSE",
    ]) {
      expect(files, needed).toContain(needed);
    }
    expect(files.some((file) => /\.test\.|^test\/|^examples\//.test(file))).toBe(false);
    expect(pack.name).toBe("@thixpin/md2book");
    const { version } = JSON.parse(readFileSync(`${ROOT}package.json`, "utf8")) as {
      version: string;
    };
    expect(pack.version).toBe(version);
  });
});
