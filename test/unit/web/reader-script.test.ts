import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// SHA-256 of development-book/publish/web-reader.js at d235dbd (specs/decision-log.md).
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
  [
    '  const numbers = {\n    left: reader.querySelector(\'[data-page-number="left"]\'),\n    right: reader.querySelector(\'[data-page-number="right"]\'),\n  };\n  // md2book: running heads (spec 004 FR-023), placed like the folios.\n  const heads = {\n    left: reader.querySelector(\'[data-page-head="left"]\'),\n    right: reader.querySelector(\'[data-page-head="right"]\'),\n  };\n  const bookAuthor = reader.dataset.author || "";\n',
    "  const numbers = {\n    left: reader.querySelector('[data-page-number=\"left\"]'),\n    right: reader.querySelector('[data-page-number=\"right\"]'),\n  };\n",
  ],
  [
    '    const number = document.createElement("span");\n    number.className = "page-number";\n    const head = document.createElement("span");\n    head.className = "page-head";\n    el.replaceChildren(copy, number, head);\n    return { el, copy, number, head, originX };',
    '    const number = document.createElement("span");\n    number.className = "page-number";\n    el.replaceChildren(copy, number);\n    return { el, copy, number, originX };',
  ],
  [
    '    surface.number.style.visibility = exists && pageIndex >= frontPages && pageIndex < bodyEnd ? "" : "hidden";\n    surface.head.style.visibility = exists && hasHead(pageIndex) ? "" : "hidden";\n',
    '    surface.number.style.visibility = exists && pageIndex >= frontPages && pageIndex < bodyEnd ? "" : "hidden";\n',
  ],
  [
    "    placeFolio(surface.number, pageIndex, surface.originX);\n    placeHead(surface.head, pageIndex, surface.originX);\n",
    "    placeFolio(surface.number, pageIndex, surface.originX);\n",
  ],
  [
    '  // md2book (spec 004 FR-023): the foot of each page is the page number at the outer corner and\n  // the book title at the inner one; its head is the author outside and the chapter title inside.\n  // Both span the text block, in the padding where no text flows. `originX` is the window x of\n  // the left edge of the element they are drawn in.\n  function placeFolio(el, pageIndex, originX) {\n    placeLine(el, pageIndex, originX, burmeseDigits(pageLabel(pageIndex)), bookTitle, false);\n  }\n\n  function placeHead(el, pageIndex, originX) {\n    placeLine(el, pageIndex, originX, bookAuthor, chapterAt(pageIndex)?.shortTitle ?? "", true);\n  }\n\n  // Numbered pages carry a head, except a chapter\'s first page, whose own head shows the titles.\n  const hasHead = (page) =>\n    page >= frontPages && page < bodyEnd && !chapterStarts.some((start) => start.page === page);\n\n  function placeLine(el, pageIndex, originX, outside, inside, top) {\n    const styles = getComputedStyle(flow);\n    const onLeft = pagesPerView === 2 && pageIndex % 2 === 0;\n    const left = onLeft\n      ? parseFloat(styles.paddingLeft)\n      : windowEl.clientWidth - parseFloat(styles.paddingRight) - pageWidth;\n    const y = top\n      ? parseFloat(styles.paddingTop) * 0.36\n      : windowEl.clientHeight - parseFloat(styles.paddingBottom) * 0.36;\n    const outer = document.createElement("span");\n    outer.className = "outside";\n    outer.textContent = outside;\n    const inner = document.createElement("span");\n    inner.className = "inside";\n    inner.textContent = inside;\n    el.replaceChildren(...(onLeft ? [outer, inner] : [inner, outer]));\n    el.style.width = `${pageWidth}px`;\n    el.style.transform = `translate(${left - originX}px, ${y}px) translateY(${top ? 0 : -100}%)`;\n  }\n',
    "  // Puts a page number at its page's outer bottom corner: aligned with the\n  // text block's outer edge, inside the bottom padding where no text flows.\n  // `originX` is the window x of the left edge of the element it is drawn in.\n  function placeFolio(el, pageIndex, originX) {\n    const styles = getComputedStyle(flow);\n    const onLeft = pagesPerView === 2 && pageIndex % 2 === 0;\n    const x = onLeft\n      ? parseFloat(styles.paddingLeft)\n      : windowEl.clientWidth - parseFloat(styles.paddingRight);\n    const bottom = windowEl.clientHeight - parseFloat(styles.paddingBottom) * 0.36;\n    el.textContent = burmeseDigits(pageLabel(pageIndex));\n    el.style.transform = `translate(${x - originX}px, ${bottom}px) ` +\n      `translate(${onLeft ? 0 : -100}%, -100%)`;\n  }\n",
  ],
  [
    "    numbers.left.hidden = numbers.right.hidden = true;\n    heads.left.hidden = heads.right.hidden = true;\n    slots.forEach((slot, offset) => {\n      const page = firstPage + offset;\n      if (page >= pageCount || page < frontPages || page >= bodyEnd) return;\n      placeFolio(numbers[slot], page, 0);\n      numbers[slot].hidden = false;\n      if (hasHead(page)) {\n        placeHead(heads[slot], page, 0);\n        heads[slot].hidden = false;\n      }\n    });",
    "    numbers.left.hidden = numbers.right.hidden = true;\n    slots.forEach((slot, offset) => {\n      const page = firstPage + offset;\n      if (page >= pageCount || page < frontPages || page >= bodyEnd) return;\n      placeFolio(numbers[slot], page, 0);\n      numbers[slot].hidden = false;\n    });",
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
