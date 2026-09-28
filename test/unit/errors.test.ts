import { afterEach, describe, expect, it, vi } from "vitest";
import { BookError, warn } from "../../src/errors.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BookError", () => {
  it("formats a single line naming the subject and the reason", () => {
    const error = new BookError("book.json", "cover not found: cover.png");
    expect(error.message).toBe("book-build: book.json: cover not found: cover.png");
    expect(error.message).not.toContain("\n");
    expect(error.subject).toBe("book.json");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("warn", () => {
  it("writes a warning line to stderr", () => {
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    warn("unknown key: strings.chapter_lable");
    expect(write).toHaveBeenCalledWith("warning: unknown key: strings.chapter_lable\n");
  });
});
