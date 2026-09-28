import { describe, expect, it } from "vitest";
import { titleSlug } from "../../../src/init/slug.ts";

describe("titleSlug", () => {
  it.each([
    ["Data Structures & Algorithms", "data-structures-algorithms"],
    ["  Hello,  World!  ", "hello-world"],
    ["C++ in 2026", "c-in-2026"],
    ["ဒေတာ", "book"],
    ["ဒေတာ Book 2", "book-2"],
    ["---", "book"],
  ])("%j → %j", (title, slug) => {
    expect(titleSlug(title)).toBe(slug);
  });
});
