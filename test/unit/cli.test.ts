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
  it.each([
    [["cover"], "cover"],
    [["build", "pdf"], "build pdf"],
  ])("reserved command %j prints 'not available yet' and exits 1", async (argv, name) => {
    const io = capture();
    const code = await runCli(argv, io.deps);
    expect(code).toBe(1);
    expect(io.err.join("")).toBe(`md2book: ${name}: not available yet\n`);
  });

  it("says 'not available yet' even when options are passed to a reserved command", async () => {
    const io = capture();
    const code = await runCli(["build", "pdf", "--config", "book.json", "--printed"], io.deps);
    expect(code).toBe(1);
    expect(io.err.join("")).toBe("md2book: build pdf: not available yet\n");
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
    const code = await runCli(["cover"], io.deps);
    expect(code).toBe(1);
    expect(io.err.join("").trimEnd().split("\n")).toHaveLength(1);
  });

  it("exits non-zero for an unknown command", async () => {
    const io = capture();
    const code = await runCli(["nope"], io.deps);
    expect(code).not.toBe(0);
  });
});
