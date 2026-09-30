// Spec 006 US4: the arrow-key choice and text prompts of the init wizard (research R-04).
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { BookError } from "../../../src/errors.ts";
import { openTerminal } from "../../../src/init/select.ts";

const UP = "\u001b[A";
const DOWN = "\u001b[B";
const ENTER = "\r";

function terminal(keys: string) {
  const input = Object.assign(new PassThrough(), { isTTY: true });
  const output = new PassThrough();
  let shown = "";
  output.on("data", (chunk: Buffer) => (shown += chunk.toString()));
  input.write(keys);
  return { term: openTerminal({ input, output }), shown: () => shown };
}

const choices = [
  { label: "Use default configuration", value: "default" },
  { label: "Configure with wizard", value: "wizard" },
  { label: "Third", value: "third" },
];

describe("openTerminal", () => {
  it("pre-selects the first choice, marked ❯, and returns it on Enter", async () => {
    const { term, shown } = terminal(ENTER);
    expect(await term.select("How would you like to configure your book?", choices)).toBe(
      "default",
    );
    term.close();
    expect(shown()).toContain("How would you like to configure your book?");
    expect(shown()).toContain("❯ Use default configuration");
    expect(shown()).toContain("  Configure with wizard");
  });

  it("moves with the arrow keys, stopping at the ends", async () => {
    const { term } = terminal(`${UP}${DOWN}${DOWN}${DOWN}${DOWN}${UP}${ENTER}`);
    expect(await term.select("Q", choices)).toBe("wizard");
    term.close();
  });

  it("selects directly with a digit", async () => {
    const { term } = terminal("3");
    expect(await term.select("Q", choices)).toBe("third");
    term.close();
  });

  it("reads text with backspace, and keeps keys typed ahead for the next prompt", async () => {
    const { term } = terminal(`srx\u007fc${ENTER}${DOWN}${ENTER}My Book${ENTER}`);
    expect(await term.text("Chapter folder")).toBe("src");
    expect(await term.select("Q", choices)).toBe("wizard");
    expect(await term.text("Title")).toBe("My Book");
    term.close();
  });

  it("stops with a one-line error on Ctrl+C", async () => {
    const { term } = terminal("\u0003");
    const error: unknown = await term.select("Q", choices).catch((e: unknown) => e);
    term.close();
    expect(error).toBeInstanceOf(BookError);
    expect((error as BookError).message).toBe("md2book: init: cancelled");
  });
});
