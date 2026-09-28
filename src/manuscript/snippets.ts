import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { BookError } from "../errors.ts";
import type { Chapter, SnippetInclude } from "./chapters.ts";
import { dedent } from "./dedent.ts";

// Python's `[\w-]` becomes ASCII `[A-Za-z0-9_-]` (see docs/decision-log.md).
const MARKER_RE = /^<!--\s*include:\s*([^#\s]+)(?:#([A-Za-z0-9_-]+))?\s*-->\s*$/u;
const REGION_RE = /^\s*(?:\/\/|#)\s*#(end)?region\b\s*([A-Za-z0-9_-]*)\s*$/u;
const FENCE_RE = /^\s*(```|~~~)/u;
const LANGUAGES: Record<string, string> = {
  ".ts": "ts",
  ".js": "js",
  ".json": "json",
  ".py": "python",
  ".sh": "bash",
};

/** Replaces include markers in `chapter.bodyMd`; sets `expandedMd` and `includes`. */
export function expandSnippets(chapter: Chapter, codeRoot: string): void {
  const out: string[] = [];
  const includes: SnippetInclude[] = [];
  let inFence = false;
  for (const line of chapter.bodyMd.split("\n")) {
    if (FENCE_RE.test(line)) inFence = !inFence;
    const marker = inFence ? null : MARKER_RE.exec(line.trim());
    if (!marker) {
      out.push(line);
      continue;
    }
    const [, path, region] = marker as unknown as [string, string, string | undefined];
    const ref = region ? `${path}#${region}` : path;
    let code: string;
    try {
      code = extract(join(codeRoot, path), path, region);
    } catch (error) {
      if (error instanceof SnippetError) throw new BookError(chapter.sourcePath, error.message);
      throw error;
    }
    const language = LANGUAGES[extname(path).toLowerCase()] ?? "";
    out.push(`\`\`\`${language}\n${code}\n\`\`\``);
    includes.push({ path, ...(region ? { region } : {}), ...(language ? { language } : {}), ref });
  }
  chapter.expandedMd = out.join("\n");
  chapter.includes = includes;
}

class SnippetError extends Error {}

function extract(file: string, path: string, region: string | undefined): string {
  if (!existsSync(file) || !statSync(file).isFile()) {
    throw new SnippetError(`file not found: ${path}`);
  }
  const lines = readFileSync(file, "utf8").split("\n");
  let body: string[];
  if (region === undefined) {
    body = lines.filter((line) => !REGION_RE.test(line));
  } else {
    body = [];
    let depth = 0;
    let found = false;
    for (const line of lines) {
      const m = REGION_RE.exec(line);
      if (depth === 0) {
        if (m && !m[1] && m[2] === region) {
          depth = 1;
          found = true;
        }
        continue;
      }
      if (m) {
        depth += m[1] ? -1 : 1;
        if (depth === 0) break;
        continue;
      }
      body.push(line);
    }
    if (!found) throw new SnippetError(`region not found: ${path}#${region}`);
    if (depth !== 0) throw new SnippetError(`region not closed: ${path}#${region}`);
  }
  return dedent(body.join("\n")).replace(/^\n+|\n+$/g, "");
}
