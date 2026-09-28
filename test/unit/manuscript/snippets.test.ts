import { describe, expect, it } from "vitest";
import type { Chapter } from "../../../src/manuscript/chapters.ts";
import { expandSnippets } from "../../../src/manuscript/snippets.ts";
import { BookError } from "../../../src/errors.ts";
import { fixture } from "../../helpers/temp.ts";

const codeRoot = fixture("code");
const chapter = (bodyMd: string) =>
  ({ sourcePath: "/book/chapters/chapter-01.md", bodyMd }) as Chapter;

function expand(bodyMd: string) {
  const ch = chapter(bodyMd);
  expandSnippets(ch, codeRoot);
  return ch;
}

function expandError(bodyMd: string): BookError {
  try {
    expand(bodyMd);
  } catch (error) {
    expect(error).toBeInstanceOf(BookError);
    return error as BookError;
  }
  throw new Error("expected a BookError");
}

describe("expandSnippets", () => {
  it("includes a named region, dropping nested markers and keeping their content", () => {
    const ch = expand("Intro\n<!-- include: sample.ts#greet -->\nOutro\n");
    expect(ch.expandedMd).toBe(
      "Intro\n```ts\n" +
        "export function greet(name: string): string {\n" +
        "  const greeting = `Hello, ${name}`;\n" +
        "  return greeting;\n" +
        "}\n```\nOutro\n",
    );
    expect(ch.includes).toEqual([
      { path: "sample.ts", region: "greet", language: "ts", ref: "sample.ts#greet" },
    ]);
  });

  it("includes a whole file without any region marker lines", () => {
    const ch = expand("<!-- include: sample.js -->");
    expect(ch.expandedMd).toBe("```js\nexport const add = (a, b) => a + b;\n```");
    expect(ch.includes?.[0]?.ref).toBe("sample.js");
  });

  it("handles # region markers, dedents and trims blank lines", () => {
    const ch = expand("<!-- include: sample.py#setup -->");
    expect(ch.expandedMd).toBe("```python\ndef setup():\n    value = 1\n\n    return value\n```");
  });

  it.each([
    ["sample.sh#run", "bash"],
    ["sample.json", "json"],
    ["notes.txt", ""],
  ])("takes the language of %s from its extension", (ref, lang) => {
    expect(expand(`<!-- include: ${ref} -->`).expandedMd).toMatch(new RegExp(`^\`\`\`${lang}\n`));
  });

  it("matches a marker with surrounding whitespace", () => {
    expect(expand("   <!--  include: sample.js   -->  ").includes).toHaveLength(1);
  });

  it("leaves markers inside fenced code blocks untouched", () => {
    const body =
      "```md\n<!-- include: sample.js -->\n```\n~~~\n<!-- include: missing.ts -->\n~~~\n";
    const ch = expand(body);
    expect(ch.expandedMd).toBe(body);
    expect(ch.includes).toEqual([]);
  });

  it("treats markers after an unterminated fence as inside the fence", () => {
    const body = "```\ncode\n<!-- include: missing.ts -->\n";
    expect(expand(body).expandedMd).toBe(body);
  });

  it.each([
    ["missing.ts", "file not found: missing.ts"],
    ["sample.ts#nope", "region not found: sample.ts#nope"],
    ["unclosed.ts#open", "region not closed: unclosed.ts#open"],
  ])("stops on %s, naming the chapter", (ref, reason) => {
    const error = expandError(`<!-- include: ${ref} -->`);
    expect(error.subject).toBe("/book/chapters/chapter-01.md");
    expect(error.reason).toBe(reason);
  });

  it("accepts only ASCII region names", () => {
    const ch = expand("<!-- include: sample.ts#ကက -->");
    expect(ch.includes).toEqual([]);
  });
});
