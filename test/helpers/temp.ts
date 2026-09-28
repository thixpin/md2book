import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach } from "vitest";

const created: string[] = [];

afterEach(() => {
  while (created.length) rmSync(created.pop()!, { recursive: true, force: true });
});

/** Creates a temp dir with the given files (string or bytes) and removes it after the test. */
export function tempDir(files: Record<string, string | Uint8Array> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "md2book-"));
  created.push(dir);
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return dir;
}

export const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

export const fixture = (...parts: string[]) =>
  new URL(`../fixtures/${parts.join("/")}`, import.meta.url).pathname;
