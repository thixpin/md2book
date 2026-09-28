import { createHash } from "node:crypto";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setFiles, type FontSet } from "../fonts/manifest.ts";

const ASSETS = fileURLToPath(new URL("../../assets/", import.meta.url));
const read = (path: string) => readFileSync(join(ASSETS, path), "utf8");

/** Reference font names in the carried CSS (my-sans), replaced for other sets (research R-02). */
const REFERENCE_FILES = {
  "body-regular": "NotoSansMyanmar-Regular.ttf",
  "body-bold": "NotoSansMyanmar-Bold.ttf",
  "mono-regular": "NotoSansMono-Regular.ttf",
} as const;

/** `common.css` + `web.css`, unchanged for my-sans; family and file names swapped otherwise. */
export function stylesheet(set: FontSet): string {
  let css = `${read("css/common.css")}\n${read("css/web.css")}`;
  if (set.id === "my-sans") return css;
  for (const [role, reference] of Object.entries(REFERENCE_FILES)) {
    const file = set.faces.find((face) => face.role === role)!.file;
    css = css.replaceAll(`fonts/${reference}`, `fonts/${file}`);
  }
  return css
    .replaceAll('"Noto Sans Myanmar"', `"${set.body_family}"`)
    .replaceAll('"Noto Sans Mono"', `"${set.mono_family}"`);
}

export function readerScript(): string {
  return read("web-reader.js");
}

/** `<stem>.<first 12 hex digits of sha256>.<ext>`. */
export function hashedName(stem: string, ext: string, content: string): string {
  return `${stem}.${createHash("sha256").update(content).digest("hex").slice(0, 12)}.${ext}`;
}

/** Writes the stylesheet, reader script and the set's fonts; returns the hashed names. */
export function writeAssets(
  web: string,
  set: FontSet,
  fontsDir: string,
): { stylesheet: string; script: string } {
  const css = stylesheet(set);
  const script = readerScript();
  const names = {
    stylesheet: hashedName("style", "css", css),
    script: hashedName("reader", "js", script),
  };
  writeFileSync(join(web, names.stylesheet), css);
  writeFileSync(join(web, names.script), script);
  for (const { file } of setFiles(set))
    copyFileSync(join(fontsDir, file), join(web, "fonts", file));
  return names;
}
