import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadChapters } from "../../../src/manuscript/chapters.ts";
import { loadParts } from "../../../src/manuscript/parts.ts";
import { bookMm } from "../../helpers/fixture-config.ts";
import { fixture } from "../../helpers/temp.ts";

export function hashTree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    out[path] = createHash("sha256").update(readFileSync(path)).digest("hex");
  }
  return out;
}

describe("manuscript sources (Constitution II)", () => {
  it("are byte-identical after loading chapters and parts", async () => {
    const before = hashTree(fixture("book-mm"));
    const config = await bookMm();
    await loadParts(config, await loadChapters(config));
    expect(hashTree(fixture("book-mm"))).toEqual(before);
  });
});
