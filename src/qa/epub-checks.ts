import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";
import { decodeHTML } from "entities";
import { XMLValidator } from "fast-xml-parser";
import yauzl from "yauzl";
import type { Chapter } from "../manuscript/chapters.ts";
import { PY_WS } from "./stats.ts";

interface Entry {
  name: string;
  method: number;
  data: Buffer;
}

function readZip(path: string): Promise<Entry[]> {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true }, (error, zip) => {
      if (error) return reject(error);
      const entries: Entry[] = [];
      zip.on("entry", (entry: yauzl.Entry) => {
        zip.openReadStream(entry, (err, stream) => {
          if (err) return reject(err);
          const chunks: Buffer[] = [];
          stream.on("data", (c: Buffer) => chunks.push(c));
          stream.on("end", () => {
            entries.push({
              name: entry.fileName,
              method: entry.compressionMethod,
              data: Buffer.concat(chunks),
            });
            zip.readEntry();
          });
        });
      });
      zip.on("end", () => resolve(entries));
      zip.on("error", reject);
      zip.readEntry();
    });
  });
}

export interface EpubCheckResult {
  errors: string[];
  fixedLayout: boolean;
  fontsEmbedded: string[];
  chapterDocs: number;
  textMismatchChapters: string[];
  epubcheck?: { passed: boolean; output: string };
}

const allWhitespace = new RegExp(`[${PY_WS}]`, "gu");

/** Port of qa.py `epub_checks` (without the em dash count, removed by spec 003). */
export async function epubChecks(file: string, chapters: Chapter[]): Promise<EpubCheckResult> {
  const entries = await readZip(file);
  const byName = new Map(entries.map((e) => [e.name, e]));
  const text = (name: string) => byName.get(name)?.data.toString("utf8");
  const errors: string[] = [];
  if (entries[0]?.name !== "mimetype") errors.push("mimetype is not the first zip entry");
  if (byName.get("mimetype")?.method !== 0) errors.push("mimetype is compressed");
  const opf = text("OEBPS/content.opf") ?? "";
  const xhtml = entries.filter((e) => e.name.endsWith(".xhtml"));
  for (const e of xhtml) {
    const result = XMLValidator.validate(e.data.toString("utf8"));
    if (result !== true) errors.push(`${e.name}: not well-formed XML: ${result.err.msg}`);
  }
  for (const m of opf.matchAll(/href="([^"]+)"/g)) {
    if (!byName.has(`OEBPS/${m[1]}`)) errors.push(`manifest href missing: ${m[1]}`);
  }
  const textMismatchChapters = chapters
    .filter((ch) => {
      const x = text(`OEBPS/text/${ch.slug}.xhtml`) ?? "";
      const body = x.includes("</header>") ? x.slice(x.indexOf("</header>") + 9) : x;
      const got = decodeHTML(body.replace(/<[^>]+>/g, "")).replace(allWhitespace, "");
      return got !== (ch.plainText ?? "").replace(allWhitespace, "");
    })
    .map((ch) => ch.slug);
  return {
    errors,
    fixedLayout: opf.includes("rendition:layout") && opf.includes("pre-paginated"),
    fontsEmbedded: entries.filter((e) => e.name.endsWith(".ttf")).map((e) => e.name),
    chapterDocs: xhtml.filter((e) => /\/ch\d{2}\.xhtml$/.test(e.name)).length,
    textMismatchChapters,
    epubcheck: await runEpubcheck(file),
  };
}

function onPath(command: string): string | undefined {
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    const candidate = join(dir, command);
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // not in this directory
    }
  }
  return undefined;
}

/** Runs `epubcheck` from PATH; undefined when it is not installed. Keeps the last 4000 characters. */
export function runEpubcheck(
  file: string,
): Promise<{ passed: boolean; output: string } | undefined> {
  const bin = onPath("epubcheck");
  if (!bin) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    execFile(bin, [file], { maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      const output = `${stdout}${stderr}`.trim();
      resolve({ passed: !error, output: output.slice(-4000) });
    });
  });
}
