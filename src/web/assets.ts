import { createHash } from "node:crypto";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setFiles, type FontSet } from "../fonts/manifest.ts";

const ASSETS = fileURLToPath(new URL("../../assets/", import.meta.url));
const read = (path: string) => readFileSync(join(ASSETS, path), "utf8");

/** Font files named in the carried CSS (the my-sans set), by role (research R-02, spec 003 R-07). */
const REFERENCE_FILES: Record<string, string> = {
  "body-regular": "NotoSansMyanmar-Regular.ttf",
  "body-semibold": "NotoSansMyanmar-SemiBold.ttf",
  "body-bold": "NotoSansMyanmar-Bold.ttf",
  "body-italic": "NotoSansMyanmar-Italic.ttf",
  "body-bolditalic": "NotoSansMyanmar-BoldItalic.ttf",
  "mono-regular": "NotoSansMono-Regular.ttf",
  "mono-bold": "NotoSansMono-Bold.ttf",
};

/** Points the carried CSS at another set's files and family names; identity for my-sans. */
export function substituteFonts(css: string, set: FontSet): string {
  if (set.id === "my-sans") return css;
  for (const [role, reference] of Object.entries(REFERENCE_FILES)) {
    const face = set.faces.find((f) => f.role === role);
    // A face the set lacks: drop its rule so the renderer synthesises the style (spec 006).
    if (!face)
      css = css.replace(
        new RegExp(`@font-face \\{[^}]*${reference.replace(".", "\\.")}[^}]*\\}\\n?`, "g"),
        "",
      );
    else css = css.replaceAll(reference, face.file);
  }
  return css
    .replaceAll('"Noto Sans Myanmar"', `"${set.body_family}"`)
    .replaceAll('"Noto Sans Mono"', `"${set.mono_family}"`);
}

/** Web stylesheet: `common.css` + `web.css`, with the set's fonts. */
export function stylesheet(set: FontSet): string {
  return substituteFonts(`${read("css/common.css")}\n${read("css/web.css")}`, set);
}

/** EPUB stylesheets (`css/common.css`, `css/epub.css`), with the set's fonts. */
export function epubStylesheets(set: FontSet): { common: string; epub: string } {
  return {
    common: substituteFonts(read("css/common.css"), set),
    epub: substituteFonts(read("css/epub.css"), set),
  };
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
