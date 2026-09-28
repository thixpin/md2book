import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { BookConfig } from "../config/load.ts";
import { BookError } from "../errors.ts";
import type { Chapter } from "./chapters.ts";
import { findFiles, normalizeSource } from "./text.ts";

export interface Part {
  label: string;
  title: string;
  first: number;
  last: number;
  chapters: Chapter[];
}

const PART_HEAD_RE = /^#\s+(Part\s+[IVX]+)\s*-\s*(.+?)\s*$/u;
const PART_RANGE_RE = /^chapters:\s*(\d+)\s*-\s*(\d+)\s*$/mu;

/** Parts only group the contents list; they add no pages. */
export async function loadParts(config: BookConfig, chapters: Chapter[]): Promise<Part[]> {
  if (!config.part_glob) return [];

  const parts: Part[] = [];
  for (const path of await findFiles(config.part_glob)) {
    const text = normalizeSource(await readFile(path, "utf8"));
    const first = text.split("\n").find((line) => line.trim() !== "") ?? "";
    const head = PART_HEAD_RE.exec(first);
    const range = PART_RANGE_RE.exec(text);
    if (!head || !range) {
      throw new BookError(path, "expected '# Part N - Title' and a 'chapters: a-b' line");
    }
    parts.push({
      label: head[1]!,
      title: head[2]!,
      first: Number(range[1]),
      last: Number(range[2]),
      chapters: [],
    });
  }

  for (const chapter of chapters) {
    const part = parts.find((p) => p.first <= chapter.number && chapter.number <= p.last);
    if (!part) {
      throw new BookError(
        basename(chapter.sourcePath),
        `chapter ${chapter.number} is not covered by any part file`,
      );
    }
    part.chapters.push(chapter);
  }
  return parts;
}
