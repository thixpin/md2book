import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli.ts";

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    deps: { stdout: (s: string) => out.push(s), stderr: (s: string) => err.push(s) },
  };
}

describe("runCli", () => {
  it("requires the cover HTML for cover", async () => {
    const io = capture();
    const code = await runCli(["cover"], io.deps);
    expect(code).not.toBe(0);
    expect(io.err.join("")).toContain("missing required argument 'file'");
  });

  // The repository root has no book.json, so the default config is reported as unreadable.
  it.each([
    ["build", "pdf", "--printed"],
    ["build", "epub"],
    ["build", "web"],
    ["build", "all"],
    ["qa"],
    ["serve"],
    ["fonts"],
  ])("defaults --config to book.json: %s", async (...args) => {
    const io = capture();
    const code = await runCli(args, io.deps);
    expect(code).toBe(1);
    expect(io.err.join("")).toBe(`md2book: ${resolve("book.json")}: cannot read config file\n`);
  });

  it.each(["epub", "web", "all", "pdf"])(
    "builds editions only through `build`: top-level %s is unknown",
    async (command) => {
      const io = capture();
      const code = await runCli([command, "--config", "book.json"], io.deps);
      expect(code).not.toBe(0);
      expect(io.err.join("")).toContain(`unknown command '${command}'`);
    },
  );

  it("maps a thrown BookError to exit code 1 with a one-line message", async () => {
    const io = capture();
    const code = await runCli(["cover", "/no/such/cover.html"], io.deps);
    expect(code).toBe(1);
    expect(io.err.join("").trimEnd().split("\n")).toHaveLength(1);
  });

  it("exits non-zero for an unknown command", async () => {
    const io = capture();
    const code = await runCli(["nope"], io.deps);
    expect(code).not.toBe(0);
  });

  it("lists the init presets in its help (spec 006)", async () => {
    const io = capture();
    await runCli(["init", "--help"], io.deps);
    const help = io.out.join("");
    for (const flag of [
      "--page-size <size>",
      "--font-family <id>",
      "--font-size <size>",
      "--chapters <folder>",
    ]) {
      expect(help).toContain(flag);
    }
  });

  it.each([["-v"], ["--version"]])("prints the package version with %s", async (flag) => {
    const { version } = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { version: string };
    const io = capture();
    expect(await runCli([flag], io.deps)).toBe(0);
    expect(io.out.join("")).toBe(`${version}\n`);
  });

  it.each([
    [
      ["init"],
      [
        "-l, --lang",
        "-t, --title",
        "-a, --author",
        "-p, --page-size",
        "-f, --font-family",
        "-s, --font-size",
      ],
    ],
    [["fonts"], ["-c, --config", "-s, --set"]],
    [["cover"], ["-o, --output", "-d, --dpi", "-c, --config", "-s, --set"]],
    [
      ["build", "pdf"],
      ["-c, --config", "-o, --out", "-p, --printed"],
    ],
    [
      ["build", "epub"],
      ["-c, --config", "-o, --out"],
    ],
    [
      ["build", "web"],
      ["-c, --config", "-o, --out"],
    ],
    [
      ["build", "all"],
      ["-c, --config", "-o, --out", "-p, --printed"],
    ],
    [["qa"], ["-c, --config", "-o, --out", "-p, --printed"]],
    [["serve"], ["-c, --config", "-o, --out", "-p, --port"]],
  ])("offers short options for %j", async (command, flags) => {
    const io = capture();
    await runCli([...command, "-h"], io.deps);
    const help = io.out.join("");
    for (const flag of flags) expect(help).toContain(flag);
  });

  it("reads short options like long ones", async () => {
    const io = capture();
    const code = await runCli(["build", "pdf", "-c", "no-such-book.json", "-p"], io.deps);
    expect(code).toBe(1);
    expect(io.err.join("")).toBe(
      `md2book: ${resolve("no-such-book.json")}: cannot read config file\n`,
    );
  });
});
