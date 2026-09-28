import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// SHA-256 of development-book/publish/web-reader.js at d235dbd (docs/decision-log.md).
const REFERENCE_SHA256 = "bb980615d4c6973b16cc0d9c6005054dbb81c149b3e7f816c90275b57dbedb1c";

// The only edits allowed by spec 002 FR-021: [edited text, reference text].
export const READER_EDITS: [string, string][] = [
  [
    `  // Folios are printed with Myanmar digits (U+1040–U+1049), like the book,
  // unless the page asks for ASCII digits (data-folio-digits="ascii").
  const asciiFolios = reader.dataset.folioDigits === "ascii";
  const burmeseDigits = (number) =>
    asciiFolios
      ? \`\${number}\`
      : \`\${number}\`.replace(/\\d/g, (digit) => String.fromCharCode(0x1040 + +digit));`,
    `  // Folios are printed with Myanmar digits (U+1040–U+1049), like the book.
  const burmeseDigits = (number) =>
    \`\${number}\`.replace(/\\d/g, (digit) => String.fromCharCode(0x1040 + +digit));`,
  ],
  [
    `    if (page === coverPage()) return reader.dataset.nameCover || "Cover";
    if (page === contentsPage) return reader.dataset.nameContents || "Contents";
    if (page === backCoverPage) return reader.dataset.nameBackCover || "Back cover";`,
    `    if (page === coverPage()) return "Cover";
    if (page === contentsPage) return "Contents";
    if (page === backCoverPage) return "Back cover";`,
  ],
];

describe("carried reader script", () => {
  it("differs from the reference only by the FR-021 parameter reads", () => {
    let script = readFileSync(new URL("../../../assets/web-reader.js", import.meta.url), "utf8");
    for (const [edited, original] of READER_EDITS) {
      expect(script).toContain(edited);
      script = script.replace(edited, original);
    }
    expect(createHash("sha256").update(script).digest("hex")).toBe(REFERENCE_SHA256);
  });
});
