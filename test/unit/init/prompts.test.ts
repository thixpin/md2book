import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { promptMissing } from "../../../src/init/prompts.ts";

function answers(...lines: string[]) {
  const input = new PassThrough();
  const output = new PassThrough();
  const asked: string[] = [];
  output.on("data", (chunk: Buffer) => asked.push(chunk.toString()));
  // Feed one answer per question as the prompts appear.
  let next = 0;
  output.on("data", () => {
    if (next < lines.length) input.write(`${lines[next++]}\n`);
  });
  return { input, output, asked };
}

describe("promptMissing", () => {
  it("asks for missing values in order: language, font set, title, author", async () => {
    const io = answers("en", "", "My Book", "Me");
    const result = await promptMissing({}, io);
    expect(result).toEqual({ lang: "en", font: "sans", title: "My Book", author: "Me" });
    const prompts = io.asked.join("");
    expect(prompts.indexOf("Language")).toBeLessThan(prompts.indexOf("Font set"));
    expect(prompts.indexOf("Font set")).toBeLessThan(prompts.indexOf("Title"));
    expect(prompts.indexOf("Title")).toBeLessThan(prompts.indexOf("Author"));
  });

  it("asks only for values not given as flags", async () => {
    const io = answers("Me");
    const result = await promptMissing({ lang: "my", font: "serif", title: "T" }, io);
    expect(result).toEqual({ lang: "my", font: "serif", title: "T", author: "Me" });
    expect(io.asked.join("")).not.toContain("Language");
  });
});
