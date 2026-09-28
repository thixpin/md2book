import { glob } from "node:fs/promises";

/** NFC and LF line endings, in memory only (sources are never written). */
export function normalizeSource(text: string): string {
  return text.normalize("NFC").replace(/\r\n/g, "\n");
}

/** Code-point order, like Python's sorted(); never locale order. */
export function compareCodePoints(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Files matching an absolute glob pattern, sorted like Python's sorted(glob.glob(...)). */
export async function findFiles(pattern: string): Promise<string[]> {
  const files: string[] = [];
  for await (const file of glob(pattern)) files.push(file);
  return files.sort(compareCodePoints);
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

/** Same output as Python's html.escape(text, quote=True). */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]!);
}
