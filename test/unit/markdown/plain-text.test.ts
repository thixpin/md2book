import { describe, expect, it } from "vitest";
import { htmlToText } from "../../../src/markdown/plain-text.ts";

describe("htmlToText", () => {
  it("replaces tags with a space, decodes entities and collapses spaces and tabs", () => {
    expect(htmlToText("<p>A &amp; B&nbsp;&mdash;\t<b>c</b></p>\n<p>d</p>")).toBe(
      " A & B — c \n d ",
    );
  });
});
