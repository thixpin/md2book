import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BookError } from "../errors.ts";
import { fontsRoot, setDir } from "./cache.ts";
import { setFiles, type FontManifest, type FontSet } from "./manifest.ts";

export interface FetchOptions {
  fontsDir?: string;
  manifest: FontManifest;
}

const sha256 = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

async function hashOf(path: string): Promise<string | undefined> {
  return existsSync(path) ? sha256(await readFile(path)) : undefined;
}

/** Source: MD2BOOK_FONTS_SOURCE (URL or local directory), else the manifest's base_url. */
async function download(source: string, file: string): Promise<Uint8Array> {
  if (/^https?:\/\//.test(source)) {
    const url = new URL(file, source.endsWith("/") ? source : `${source}/`);
    const response = await fetch(url);
    if (!response.ok) throw new BookError(url.href, `download failed: HTTP ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
  const path = join(source, file);
  try {
    return await readFile(path);
  } catch {
    throw new BookError(path, "font file not found in source");
  }
}

/** Fetches every file of `set` into its cache directory, verifying SHA-256 against the manifest. */
export async function fetchFontSet(
  set: FontSet,
  options: FetchOptions,
): Promise<{ dir: string; files: string[] }> {
  const dir = setDir(fontsRoot(options), set.id);
  await mkdir(dir, { recursive: true });
  const source = process.env.MD2BOOK_FONTS_SOURCE || options.manifest.base_url;

  const files: string[] = [];
  for (const { file, sha256: expected } of setFiles(set)) {
    const dest = join(dir, file);
    files.push(dest);
    if ((await hashOf(dest)) === expected) continue;

    const data = await download(source, file);
    const actual = sha256(data);
    if (actual !== expected) {
      throw new BookError(file, `SHA-256 mismatch (expected ${expected}, got ${actual})`);
    }
    const temp = `${dest}.${process.pid}.tmp`;
    try {
      await writeFile(temp, data);
      await rename(temp, dest);
    } finally {
      await rm(temp, { force: true });
    }
  }
  return { dir, files };
}
