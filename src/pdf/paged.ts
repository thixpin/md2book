import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// Two exact patches to the pinned Paged.js 0.4.3 bundle (spec 004 research R-01).
const PATCHES: [string, string][] = [
  // Whitespace-only text inside <pre> is content: the highlighter puts newlines and indentation
  // there, and continued code blocks lost them.
  [
    `			((node.nodeType === 3) && isAllWhitespace(node)); // a text node, all whitespace`,
    `			((node.nodeType === 3) && isAllWhitespace(node) && !(node.parentElement && node.parentElement.closest("pre"))); // md2book: whitespace in <pre> is content`,
  ],
  // Keep sibling (+) rules native: the rewritten rules went into a stylesheet before the book's
  // own, so same-specificity overrides were lost.
  [
    `			if (selector.match(/\\+/)) {`,
    `			if (false && selector.match(/\\+/)) { // md2book: keep sibling rules native, in cascade order`,
  ],
];

export function patchPaged(source: string): string {
  let out = source;
  for (const [target, replacement] of PATCHES) {
    if (out.split(target).length !== 2) {
      throw new Error(`Paged.js patch target not found exactly once: ${target.trim()}`);
    }
    out = out.replace(target, replacement);
  }
  return out;
}

/** `pagedjs/dist/paged.polyfill.js` (not in the package's exports, so found from its entry). */
export function pagedPolyfillPath(): string {
  const entry = createRequire(import.meta.url).resolve("pagedjs"); // <root>/lib/index.cjs
  return join(dirname(entry), "..", "dist", "paged.polyfill.js");
}

/** The browser bundle served to the print page. */
export function pagedBundle(): string {
  return patchPaged(readFileSync(pagedPolyfillPath(), "utf8"));
}
