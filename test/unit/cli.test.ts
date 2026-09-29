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
  it("reserved command cover prints 'not available yet' and exits 1", async () => {
    const io = capture();
    const code = await runCli(["cover", "--config", "book.json"], io.deps);
    expect(code).toBe(1);
    expect(io.err.join("")).toBe("md2book: cover: not available yet\n");
  });

  it("requires --config for build pdf", async () => {
    const io = capture();
    const code = await runCli(["build", "pdf", "--printed"], io.deps);
    expect(code).not.toBe(0);
    expect(io.err.join("")).toContain("--config <path>");
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
