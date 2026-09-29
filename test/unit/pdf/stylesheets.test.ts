import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadManifest } from "../../../src/fonts/manifest.ts";
import { printStylesheets } from "../../../src/pdf/stylesheets.ts";
import { bookMm } from "../../helpers/fixture-config.ts";
import { FIXTURE_MANIFEST } from "../../helpers/fonts.ts";

const asset = (path: string) =>
  readFileSync(new URL(`../../../assets/${path}`, import.meta.url), "utf8");
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
const ADDITION = "/* md2book addition";

/** The carried part (before the first md2book addition) and the additions without comments. */
function split(css: string): { carried: string; added: string } {
  const at = css.indexOf(ADDITION);
  const added = at === -1 ? "" : css.slice(at).replace(/\/\*[\s\S]*?\*\//g, "");
  return { carried: at === -1 ? css : css.slice(0, at), added: added.replace(/\s+/g, " ").trim() };
}

async function sheets(printed: boolean, patch: Record<string, unknown> = {}) {
  const { sets } = await loadManifest(FIXTURE_MANIFEST);
  const config = { ...(await bookMm()), ...patch };
  return printStylesheets(sets["my-sans"], config, printed);
}

describe("printStylesheets", () => {
  it("returns common, print, paged and book stylesheets in cascade order", async () => {
    expect((await sheets(false)).map((s) => s.name)).toEqual([
      "common.css",
      "print.css",
      "paged.css",
      "book.css",
    ]);
    expect((await sheets(true)).map((s) => s.name)).toEqual([
      "common.css",
      "print.css",
      "printed.css",
      "paged.css",
      "book.css",
    ]);
  });

  it("carries print.css byte-for-byte, then only the recorded md2book additions", () => {
    const { carried, added } = split(asset("css/print.css"));
    expect(sha256(carried.replace(/\n+$/, "\n"))).toBe(
      "ba066984454101e17332978e7894e47dab737553d4ad3e17ebc436e6ca6b857d",
    );
    expect(added).toBe(
      "pre { line-height: 1.7; } h3, h4, h5, h6 { page-break-after: avoid; break-after: avoid; }",
    );
  });

  it("carries printed.css byte-for-byte, then only the terminal-dot icons", () => {
    const { carried, added } = split(asset("css/printed.css"));
    expect(sha256(carried.replace(/\n+$/, "\n"))).toBe(
      "91828a7314c79987b52479709650f2e6d72f69c1f76be231ffb6991889b0d4b2",
    );
    expect(added).toBe(
      ".terminal-dot { position: relative; } " +
        '.terminal-dot::after { content: ""; position: absolute; left: 50%; top: 50%; background: #000; transform: translate(-50%, -50%); } ' +
        ".terminal-dot:nth-child(1)::after { width: 0.26em; height: 0.26em; border-radius: 50%; } " +
        ".terminal-dot:nth-child(2)::after { width: 0.42em; height: 0.08em; } " +
        ".terminal-dot:nth-child(3)::after { width: 0.46em; height: 0.08em; transform: translate(-50%, -50%) rotate(-45deg); }",
    );
  });

  it("serves common.css and print.css unchanged for my-sans", async () => {
    const [common, print] = await sheets(false);
    expect(common!.css).toBe(asset("css/common.css"));
    expect(print!.css).toBe(asset("css/print.css"));
  });

  it("points print.css at another set's files and families", async () => {
    const { sets } = await loadManifest(FIXTURE_MANIFEST);
    const print = printStylesheets(sets["en-serif"], await bookMm(), false)[1]!.css;
    expect(print).not.toContain("NotoSansMyanmar-");
    expect(print).not.toContain('"Noto Sans Myanmar"');
    expect(print).toContain(`url("../fonts/${sets["en-serif"].faces[0]!.file}")`);
    expect(print).toContain('"Noto Serif"');
  });

  it("works around Paged.js in paged.css", async () => {
    const paged = (await sheets(false)).find((s) => s.name === "paged.css")!.css;
    const rules = paged
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .trim();
    expect(rules).toBe(
      ".pagedjs_page.chapter-first .pagedjs_margin { visibility: hidden; } " +
        ".pagedjs_page.pagedjs_blank_page .pagedjs_margin { visibility: hidden; } " +
        "[data-align-last-split-element='justify']:not(p, li) { text-align-last: auto; }",
    );
  });

  it("writes the book title into the left running header as a CSS string", async () => {
    const book = (await sheets(false, { title: 'Say "hi" \\ now\nplease' })).at(-1)!;
    expect(book.name).toBe("book.css");
    expect(book.css).toBe(
      '@page :left { @top-left { content: "Say \\"hi\\" \\\\ now\\a please"; } }\n',
    );
  });

  it("removes both running headers when running_headers is false", async () => {
    const book = (await sheets(false, { running_headers: false })).at(-1)!.css;
    expect(book).toContain(
      "@page :left{@top-left{content:none}} @page :right{@top-right{content:none}}",
    );
  });
});
