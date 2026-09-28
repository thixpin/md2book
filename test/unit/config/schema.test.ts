import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { bookConfigSchema } from "../../../src/config/schema.ts";

const contractPath = new URL(
  "../../../specs/001-core-manuscript-pipeline/contracts/book-config.schema.json",
  import.meta.url,
);

const ANNOTATIONS = new Set(["$schema", "title", "description"]);

/** Sort keys, sort `required`, drop annotation-only keywords at every depth. */
function normalise(value: unknown, parentKey = ""): unknown {
  if (Array.isArray(value)) {
    const items = value.map((v) => normalise(v));
    return parentKey === "required" ? [...(items as string[])].sort() : items;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([k]) => parentKey === "properties" || !ANNOTATIONS.has(k))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => [k, normalise(v, k)]);
    return Object.fromEntries(entries);
  }
  return value;
}

const minimal = {
  title: "T",
  author: "A",
  year: "2026",
  identifier: "urn:uuid:x",
  output_name: "t",
  cover: "cover.png",
  chapter_glob: "chapters/*.md",
};

describe("book config schema", () => {
  it("matches the JSON Schema contract", () => {
    const contract: unknown = JSON.parse(readFileSync(contractPath, "utf8"));
    const generated = z.toJSONSchema(bookConfigSchema, { io: "input" });
    expect(normalise(generated)).toEqual(normalise(contract));
  });

  it.each(Object.keys(minimal))("rejects a config missing required key %s", (key) => {
    const input: Record<string, unknown> = { ...minimal };
    delete input[key];
    const result = bookConfigSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([key]);
  });

  it("rejects wrong types", () => {
    expect(bookConfigSchema.safeParse({ ...minimal, running_headers: "yes" }).success).toBe(false);
    expect(bookConfigSchema.safeParse({ ...minimal, title: 3 }).success).toBe(false);
  });

  it("applies enum values and defaults", () => {
    const parsed = bookConfigSchema.parse(minimal);
    expect(parsed.language).toBe("my");
    expect(parsed.font_set).toBe("sans");
    expect(parsed.recto_chapter_start).toBe(false);
    expect(parsed.running_headers).toBe(true);
    expect(bookConfigSchema.safeParse({ ...minimal, language: "fr" }).success).toBe(false);
    expect(bookConfigSchema.safeParse({ ...minimal, font_set: "mono" }).success).toBe(false);
  });
});
