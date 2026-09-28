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
  it.each(["pdf", "epub", "qa", "all", "cover"])(
    "reserved command %s prints 'not available yet' and exits 1",
    async (command) => {
      const io = capture();
      const code = await runCli([command], io.deps);
      expect(code).toBe(1);
      expect(io.err.join("")).toBe(`book-build: ${command}: not available yet\n`);
    },
  );

  it("says 'not available yet' even when options are passed to a reserved command", async () => {
    const io = capture();
    const code = await runCli(["pdf", "--config", "book.json", "--printed"], io.deps);
    expect(code).toBe(1);
    expect(io.err.join("")).toBe("book-build: pdf: not available yet\n");
  });

  it("maps a thrown BookError to exit code 1 with a one-line message", async () => {
    const io = capture();
    const code = await runCli(["pdf"], io.deps);
    expect(code).toBe(1);
    expect(io.err.join("").trimEnd().split("\n")).toHaveLength(1);
  });

  it("exits non-zero for an unknown command", async () => {
    const io = capture();
    const code = await runCli(["nope"], io.deps);
    expect(code).not.toBe(0);
  });
});
