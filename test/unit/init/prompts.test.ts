import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { promptMissing } from "../../../src/init/prompts.ts";

const DOWN = "\u001b[B";
// Carriage returns and the escape sequences that redraw a list.
const ANSI = new RegExp(String.raw`\r|\u001b\[[0-9;]*[A-Za-z]`, "g");
const ENTER = "\r";

/** Keys typed ahead, and the questions the prompts showed. */
function keys(...typed: string[]) {
  const input = Object.assign(new PassThrough(), { isTTY: true });
  const output = new PassThrough();
  let shown = "";
  output.on("data", (chunk: Buffer) => (shown += chunk.toString()));
  input.write(typed.join(""));
  return { input, output, shown: () => shown.replace(ANSI, "") };
}

const questions = (shown: string) => [...shown.matchAll(/^\? ([^:\n]+)/gm)].map((m) => m[1]);

describe("promptMissing", () => {
  it("default configuration: asks mode, language, title and author only (SC-004)", async () => {
    const io = keys(ENTER, ENTER, `My Book${ENTER}`, `Me${ENTER}`);
    const result = await promptMissing({}, io);
    expect(result).toEqual({ lang: "my", title: "My Book", author: "Me" });
    expect(questions(io.shown())).toEqual([
      "How would you like to configure your book?",
      "Language",
      "Title",
      "Author",
    ]);
    expect(io.shown()).toContain("❯ Use default configuration\n  Configure with wizard");
    expect(io.shown()).toContain("❯ Myanmar\n  English");
  });

  it("wizard: page size, font family, font size and chapter folder as lists", async () => {
    const io = keys(
      `${DOWN}${ENTER}`, // Configure with wizard
      ENTER, // Myanmar
      `T${ENTER}`,
      `A${ENTER}`,
      `${DOWN}${ENTER}`, // A5
      ENTER, // Noto Sans Myanmar (default)
      `${DOWN}${DOWN}${DOWN}${ENTER}`, // Large
      ENTER, // Default (chapters)
    );
    const result = await promptMissing({}, io);
    expect(result).toEqual({
      lang: "my",
      title: "T",
      author: "A",
      pageSize: "a5",
      fontFamily: "noto-sans-myanmar",
      fontSize: "l",
      chapters: "chapters",
    });
    expect(questions(io.shown()).slice(4)).toEqual([
      "Page size",
      "Font family",
      "Font size",
      "Chapter folder",
    ]);
    const shown = io.shown();
    expect(shown).toContain(
      "❯ Default (170 × 240 mm)\n  A5 (148 × 210 mm)\n  B5 (176 × 250 mm)\n  A4 (210 × 297 mm)\n  Letter (216 × 279 mm)",
    );
    expect(shown).toContain("❯ Noto Sans Myanmar (default)\n  Masterpiece Uni Round\n  Padauk");
    expect(shown).toContain("❯ Medium (default)\n  Extra Small\n  Small\n  Large\n  Extra Large");
    expect(shown).toContain("❯ Default (chapters)\n  Custom");
  });

  it("asks for text only after Custom (chapter folder)", async () => {
    const io = keys(`${DOWN}${ENTER}`, ENTER, ENTER, ENTER, `${DOWN}${ENTER}`, `src${ENTER}`);
    const result = await promptMissing({ lang: "en", title: "T", author: "A" }, io);
    expect(result).toMatchObject({ pageSize: "default", fontFamily: "noto-sans", chapters: "src" });
    expect(io.shown()).toContain("❯ Noto Sans (default)\n  Noto Serif");
    expect(questions(io.shown()).at(-1)).toBe("Chapter folder");
  });

  it("never asks what a flag already gave", async () => {
    const io = keys(`${DOWN}${ENTER}`, ENTER);
    const result = await promptMissing(
      { lang: "my", title: "T", author: "A", pageSize: "b5", font: "serif", fontSize: "s" },
      io,
    );
    expect(result).toMatchObject({
      pageSize: "b5",
      font: "serif",
      fontSize: "s",
      chapters: "chapters",
    });
    expect(questions(io.shown())).toEqual([
      "How would you like to configure your book?",
      "Chapter folder",
    ]);
  });
});
