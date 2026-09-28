import { describe, expect, it } from "vitest";
import { dedent } from "../../../src/manuscript/dedent.ts";

// Expected values match Python's textwrap.dedent.
describe("dedent", () => {
  it("removes the common leading whitespace", () => {
    expect(dedent("    a\n      b\n    c")).toBe("a\n  b\nc");
  });

  it("ignores whitespace-only lines for the margin and empties them", () => {
    expect(dedent("    a\n  \n    b")).toBe("a\n\nb");
  });

  it("keeps only the common prefix when tabs and spaces differ", () => {
    expect(dedent("\t  a\n\t b")).toBe(" a\nb");
    expect(dedent("\ta\n  b")).toBe("\ta\n  b");
  });

  it("leaves text without common indentation alone", () => {
    expect(dedent("a\n  b")).toBe("a\n  b");
  });
});
