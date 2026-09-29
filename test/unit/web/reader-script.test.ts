import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// SHA-256 of development-book/publish/web-reader.js at d235dbd (docs/decision-log.md).
const REFERENCE_SHA256 = "bb980615d4c6973b16cc0d9c6005054dbb81c149b3e7f816c90275b57dbedb1c";

// The only edits allowed by spec 002 FR-021 (incl. the text-size feature, FR-024–FR-026):
// [edited text, reference text].
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
  [
    '  const bookmarksKey = `${reader.dataset.bookKey}:bookmarks`;\n  // Text size (md2book addition, spec 002 FR-024): seven steps scale the text and titles, not\n  // code; the choice is kept per storage prefix and the book re-paginates at the same place.\n  const TEXT_SCALES = [0.85, 0.92, 1, 1.1, 1.2, 1.35, 1.5];\n  const textScaleKey = `${reader.dataset.bookKey.split(":")[0]}:text-scale`;\n  const textSmaller = reader.querySelector("[data-text-smaller]");\n  const textLarger = reader.querySelector("[data-text-larger]");\n  const textSizeOutput = reader.querySelector("[data-text-size]");\n  let textScale = TEXT_SCALES.includes(storage.read(textScaleKey, 1)) ? storage.read(textScaleKey, 1) : 1;\n  applyTextScale(textScale);',
    "  const bookmarksKey = `${reader.dataset.bookKey}:bookmarks`;",
  ],
  [
    '  function applyTextScale(scale) {\n    textScale = scale;\n    reader.style.setProperty("--text-scale", String(scale));\n    const index = TEXT_SCALES.indexOf(scale);\n    if (textSmaller) textSmaller.disabled = index === 0;\n    if (textLarger) textLarger.disabled = index === TEXT_SCALES.length - 1;\n    if (textSizeOutput) textSizeOutput.textContent = `${Math.round(scale * 100)}%`;\n  }\n\n  function stepTextScale(delta) {\n    const index = TEXT_SCALES.indexOf(textScale) + delta;\n    if (animating || index < 0 || index >= TEXT_SCALES.length) return;\n    applyTextScale(TEXT_SCALES[index]);\n    storage.write(textScaleKey, textScale);\n    measure();\n  }\n\n  function measure() {',
    "  function measure() {",
  ],
  [
    '  next.addEventListener("click", () => changeTurn(1));\n  textSmaller?.addEventListener("click", () => stepTextScale(-1));\n  textLarger?.addEventListener("click", () => stepTextScale(1));',
    '  next.addEventListener("click", () => changeTurn(1));',
  ],
  [
    '    } else if (event.key === "+" || event.key === "=") {\n      event.preventDefault();\n      stepTextScale(1);\n    } else if (event.key === "-") {\n      event.preventDefault();\n      stepTextScale(-1);\n    } else if (event.key === "ArrowLeft") {',
    '    } else if (event.key === "ArrowLeft") {',
  ],
  [
    '    return Math.max(0, Math.floor((rect.left - start + 1) / (pageWidth + pageGap))) + pageShift;\n  }\n\n  // md2book: a section heading never ends a page with fewer than two lines of what follows it\n  // (spec 004 FR-020). WebKit ignores break-after: avoid in columns, so a heading left too low\n  // starts the next page instead (Chromium already keeps them together). In document order, as\n  // each move shifts the pages after it; a heading that already starts its page stays.\n  function keepHeadingsWithContent(layOut) {\n    for (const heading of flow.querySelectorAll(".chapter-body :is(h2, h3, h4, h5, h6)")) {\n      const next = heading.nextElementSibling;\n      const before = heading.previousElementSibling?.getClientRects();\n      if (!next || !before?.length) continue;\n      // Pages counted from the heading\'s own column (0 = its page): absolute page numbers drift in\n      // WebKit, which rounds column widths, far into a long book.\n      const origin = heading.getClientRects()[0].left;\n      const pageFrom = (rect) => Math.floor((rect.left - origin + 1) / (pageWidth + pageGap));\n      const lineKeys = (rects) => new Set(rects.map((rect) => `${pageFrom(rect)}:${Math.round(rect.top)}`));\n      if (pageFrom(before[before.length - 1]) !== 0) continue;\n      const range = document.createRange();\n      range.selectNodeContents(next);\n      const lines = [...range.getClientRects()].filter((rect) => rect.width > 0);\n      const here = lineKeys(lines.filter((rect) => pageFrom(rect) === 0)).size;\n      if (here < Math.min(2, lineKeys(lines).size)) {\n        heading.classList.add("keep-with-next");\n        layOut();\n      }\n    }\n  }\n',
    "    return Math.max(0, Math.floor((rect.left - start + 1) / (pageWidth + pageGap))) + pageShift;\n  }\n",
  ],
  [
    '    book.classList.remove("needs-filler");\n    for (const heading of flow.querySelectorAll(".keep-with-next")) heading.classList.remove("keep-with-next");\n    layOut();\n    keepHeadingsWithContent(layOut);\n',
    '    book.classList.remove("needs-filler");\n    layOut();\n',
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
