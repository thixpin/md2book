import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// SHA-256 of development-book/publish/web-reader.js at d235dbd (specs/decision-log.md).
const REFERENCE_SHA256 = "bb980615d4c6973b16cc0d9c6005054dbb81c149b3e7f816c90275b57dbedb1c";

// The only edits allowed by spec 002 FR-021 (incl. the text-size feature, FR-024–FR-026, and the
// section-sized, preloaded turn surfaces recorded in specs/decision-log.md):
// [edited text, reference text].
export const READER_EDITS: [string, string][] = [
  // md2book: the text size panel sits 14 px right of its button (specs/decision-log.md).
  [
    '    const width = Math.min(window.innerWidth * 0.9, 24 * rem);\n    // The text size panel sits 14 px further right for balance; its pointer still meets the Aa button.\n    const shift = panel.id === "reader-text" ? 14 : 0;\n    const right = Math.min(\n      Math.max(8, window.innerWidth - rect.right - shift),\n      window.innerWidth - 8 - width,\n    );\n    panel.style.right = `${Math.max(0, right)}px`;\n',
    "    const width = Math.min(window.innerWidth * 0.9, 24 * rem);\n    const right = Math.min(Math.max(8, window.innerWidth - rect.right), window.innerWidth - 8 - width);\n    panel.style.right = `${Math.max(0, right)}px`;\n",
  ],
  // md2book: glass panels scroll in an inner body and point at their button
  // (specs/decision-log.md).
  [
    '    const rect = button.getBoundingClientRect();\n    const top = rect.bottom + 12; // room for the pointer\n    panel.style.inset = "auto";\n',
    '    const rect = button.getBoundingClientRect();\n    const top = rect.bottom + 6;\n    panel.style.inset = "auto";\n',
  ],
  [
    '    panel.style.right = `${Math.max(0, right)}px`;\n    // The pointer (web.css ::before) at the button\'s centre.\n    const left = window.innerWidth - Math.max(0, right) - width;\n    panel.style.setProperty("--pointer-x", `${(rect.left + rect.right) / 2 - left}px`);\n    panel.firstElementChild.style.maxHeight =\n      `min(70vh, 32rem, ${Math.max(160, window.innerHeight - top - 12)}px)`;\n  }\n',
    "    panel.style.right = `${Math.max(0, right)}px`;\n    panel.style.maxHeight = `min(70vh, 32rem, ${Math.max(160, window.innerHeight - top - 12)}px)`;\n  }\n",
  ],
  [
    '  for (const panel of document.querySelectorAll(".reader-panel")) {\n    // The panel\'s contents scroll in an inner body, so the panel itself can show its pointer.\n    const body = document.createElement("div");\n    body.className = "reader-panel-body";\n    body.append(...panel.childNodes);\n    panel.append(body);\n    panel.addEventListener("beforetoggle", (event) => {\n',
    '  for (const panel of document.querySelectorAll(".reader-panel")) {\n    panel.addEventListener("beforetoggle", (event) => {\n',
  ],
  // md2book: toolbar panels open below their button; a spinner while the text size re-paginates
  // (specs/decision-log.md).
  [
    '  const textSizeOutput = reader.querySelector("[data-text-size]");\n  // md2book: the text size panel and its spinner (stepTextScale).\n  const textPanel = document.getElementById("reader-text");\n  const textBusy = document.querySelector("[data-text-busy]");\n  let resizing = false;\n  let textScale = TEXT_SCALES.includes(storage.read(textScaleKey, 1)) ? storage.read(textScaleKey, 1) : 1;\n',
    '  const textSizeOutput = reader.querySelector("[data-text-size]");\n  let textScale = TEXT_SCALES.includes(storage.read(textScaleKey, 1)) ? storage.read(textScaleKey, 1) : 1;\n',
  ],
  [
    '    const index = TEXT_SCALES.indexOf(textScale) + delta;\n    if (animating || resizing || index < 0 || index >= TEXT_SCALES.length) return;\n    // md2book: re-paginating a long book takes a moment; the panel shows a spinner (painted\n    // before the work starts) and its buttons wait until the new layout is done.\n    resizing = true;\n    textPanel?.setAttribute("aria-busy", "true");\n    if (textBusy) textBusy.hidden = false;\n    if (textSmaller) textSmaller.disabled = true;\n    if (textLarger) textLarger.disabled = true;\n    requestAnimationFrame(() => window.setTimeout(() => {\n      applyTextScale(TEXT_SCALES[index]);\n      storage.write(textScaleKey, textScale);\n      measure();\n      resizing = false;\n      textPanel?.setAttribute("aria-busy", "false");\n      if (textBusy) textBusy.hidden = true;\n    }, 0));\n  }\n\n  // md2book: toolbar panels open just below their button, right-aligned with it and kept in the\n  // window, instead of in the middle of the screen, so the pointer barely has to move.\n  function placePanel(panel) {\n    const button = document.querySelector(`[popovertarget="${panel.id}"]`);\n    if (!button) return;\n    const rect = button.getBoundingClientRect();\n    const top = rect.bottom + 6;\n    panel.style.inset = "auto";\n    panel.style.margin = "0";\n    panel.style.top = `${top}px`;\n    // The panels are min(90vw, 24rem) wide (web.css): keep the whole panel inside the window.\n    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);\n    const width = Math.min(window.innerWidth * 0.9, 24 * rem);\n    const right = Math.min(Math.max(8, window.innerWidth - rect.right), window.innerWidth - 8 - width);\n    panel.style.right = `${Math.max(0, right)}px`;\n    panel.style.maxHeight = `min(70vh, 32rem, ${Math.max(160, window.innerHeight - top - 12)}px)`;\n  }\n',
    "    const index = TEXT_SCALES.indexOf(textScale) + delta;\n    if (animating || index < 0 || index >= TEXT_SCALES.length) return;\n    applyTextScale(TEXT_SCALES[index]);\n    storage.write(textScaleKey, textScale);\n    measure();\n  }\n",
  ],
  [
    '\n  for (const panel of document.querySelectorAll(".reader-panel")) {\n    panel.addEventListener("beforetoggle", (event) => {\n      if (event.newState === "open") placePanel(panel);\n    });\n  }\n  window.addEventListener("resize", () => {\n    const open = document.querySelector(".reader-panel:popover-open");\n    if (open) placePanel(open);\n  });\n  bookmarkToggle.addEventListener("click", toggleBookmark);\n',
    '\n  bookmarkToggle.addEventListener("click", toggleBookmark);\n',
  ],
  // md2book: 400 ms turns, a press during a turn lands it at once, and the loading cover fades
  // away (specs/decision-log.md).
  [
    "  const MAX_SHEETS = 16;\n  // md2book: 400 ms (reference 540), closer to reader apps; the curl still reads as a turn.\n  const TURN_MS = 400;\n  const MAX_FRAME_STEP = 34;\n",
    "  const MAX_SHEETS = 16;\n  const TURN_MS = 540;\n  const MAX_FRAME_STEP = 34;\n",
  ],
  [
    '  let animating = false;\n  // md2book: the page turn being animated, if any: { jump() } (runTurn).\n  let running = null;\n  let paperKey = "";\n',
    '  let animating = false;\n  let paperKey = "";\n',
  ],
  [
    '    requestAnimationFrame(() => flow.classList.remove("is-measuring"));\n    // md2book: the book is laid out; the loading cover fades away over it (web.css).\n    reader.classList.replace("is-loading", "is-ready");\n    scheduleBuild();\n',
    '    requestAnimationFrame(() => flow.classList.remove("is-measuring"));\n    // md2book: the book is laid out; replace the loading cover with it.\n    reader.classList.remove("is-loading");\n    scheduleBuild();\n',
  ],
  [
    "    let shown = false;\n    let request = 0;\n    // md2book: the running turn can be landed at once (jump), when the next press comes during it.\n    const land = () => {\n      running = null;\n      done();\n    };\n    const frame = (now) => {\n",
    "    let shown = false;\n    const frame = (now) => {\n",
  ],
  [
    "        shown = true;\n        request = requestAnimationFrame(frame);\n        return;\n",
    "        shown = true;\n        requestAnimationFrame(frame);\n        return;\n",
  ],
  [
    "      if (k < 1) {\n        request = requestAnimationFrame(frame);\n        return;\n",
    "      if (k < 1) {\n        requestAnimationFrame(frame);\n        return;\n",
  ],
  ["      }\n      land();\n    };\n", "      }\n      done();\n    };\n"],
  [
    "    };\n    running = {\n      jump() {\n        cancelAnimationFrame(request);\n        sheet.pose(to);\n        land();\n      },\n    };\n    request = requestAnimationFrame(frame);\n  }\n",
    "    };\n    requestAnimationFrame(frame);\n  }\n",
  ],
  [
    "  function changeTurn(direction) {\n    // md2book: a press during a page turn lands it at once and turns again, so pages can be\n    // skimmed; opening or closing the cover and a finger drag still make it wait.\n    if (animating && running) running.jump();\n    if (animating) return;\n",
    "  function changeTurn(direction) {\n    if (animating) return;\n",
  ],
  // md2book: the loading cover goes when the book is laid out (specs/decision-log.md).
  [
    '    requestAnimationFrame(() => flow.classList.remove("is-measuring"));\n    // md2book: the book is laid out; replace the loading cover with it.\n    reader.classList.remove("is-loading");\n    scheduleBuild();\n',
    '    requestAnimationFrame(() => flow.classList.remove("is-measuring"));\n    scheduleBuild();\n',
  ],
  // md2book: turn surfaces copy only the sections of the pages they show and prepare the next
  // and previous turns while idle (large books; specs/decision-log.md). Listed first: they undo
  // edits made on top of the ones below.
  [
    "  let chapterStarts = [];\n  // md2book: each top-level section of the flow and its pages: { el, start, pages }.\n  let sections = [];\n  let prepareTimer = 0;\n  let frontPages = 0;\n",
    "  let chapterStarts = [];\n  let frontPages = 0;\n",
  ],
  [
    "\n  // md2book: a surface holds copies of only the sections (a chapter, the contents, the back\n  // matter) of the pages it shows, instead of the whole book: 25 whole-book copies made a long\n  // book's turns take seconds and its memory grow with its length. Each section starts a new\n  // page, so it paginates the same alone. prepareTurns() makes the copies for the next and the\n  // previous turn while the reader is idle, so a turn starts without cloning anything.\n  function makeSurface(el, originX) {\n",
    "\n  function makeSurface(el, originX) {\n",
  ],
  [
    '  function makeSurface(el, originX) {\n    const number = document.createElement("span");\n',
    '  function makeSurface(el, originX) {\n    const copy = flow.cloneNode(true);\n    copy.classList.add("turn-copy");\n    copy.classList.remove("is-measuring");\n    copy.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));\n    const number = document.createElement("span");\n',
  ],
  [
    '    head.className = "page-head";\n    el.replaceChildren(number, head);\n    return { el, copy: null, copies: new Map(), number, head, originX };\n  }\n',
    '    head.className = "page-head";\n    el.replaceChildren(copy, number, head);\n    return { el, copy, number, head, originX };\n  }\n',
  ],
  [
    '  }\n\n  function copyFor(surface, section) {\n    let copy = surface.copies.get(section);\n    if (!copy) {\n      copy = flow.cloneNode(false);\n      copy.classList.add("turn-copy");\n      copy.classList.remove("is-measuring");\n      copy.append(section.el.cloneNode(true));\n      copy.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));\n      const styles = getComputedStyle(flow);\n      const padding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);\n      copy.style.columnCount = `${section.pages}`;\n      copy.style.width = `${section.pages * pageWidth + (section.pages - 1) * pageGap + padding}px`;\n      copy.style.visibility = "hidden";\n      surface.el.prepend(copy);\n      surface.copies.set(section, copy);\n    }\n    return copy;\n  }\n\n  function useSection(surface, section) {\n    const copy = copyFor(surface, section);\n    if (surface.copy && surface.copy !== copy) surface.copy.style.visibility = "hidden";\n    surface.copy = copy;\n  }\n\n  // The pages a turn from the current spread to `targetTurn` shows on the sheet\'s front and back\n  // and under it (as startTurn places them).\n  function turnPages(direction, targetTurn) {\n    const currentStart = turn * pagesPerView;\n    const targetStart = targetTurn * pagesPerView;\n    return {\n      front: (direction > 0 ? currentStart : targetStart) + pagesPerView - 1,\n      back: pagesPerView === 2 ? (direction > 0 ? targetStart : currentStart) : null,\n      under: direction > 0 ? targetStart + pagesPerView - 1 : targetStart,\n    };\n  }\n\n  function prepareTurns() {\n    window.clearTimeout(prepareTimer);\n    if (!surfaces || animating) return;\n    const lastTurn = Math.floor((pageCount - 1) / pagesPerView);\n    const wanted = new Map([...surfaces.strips.flatMap(({ front, back }) => [front, back]), surfaces.under]\n      .map((surface) => [surface, new Set()]));\n    for (const direction of [1, -1]) {\n      const target = turn + direction;\n      if (target < 0 || target > lastTurn) continue;\n      const pages = turnPages(direction, target);\n      const need = (surface, page) => {\n        if (page === null || page < pageShift || page >= pageCount) return;\n        const section = sectionAt(page);\n        copyFor(surface, section);\n        wanted.get(surface).add(section);\n      };\n      surfaces.strips.forEach(({ front, back }) => {\n        need(front, pages.front);\n        need(back, pages.back);\n      });\n      need(surfaces.under, pages.under);\n    }\n    for (const [surface, sections] of wanted) {\n      for (const [section, copy] of surface.copies) {\n        if (sections.has(section) || copy === surface.copy) continue;\n        copy.remove();\n        surface.copies.delete(section);\n      }\n    }\n  }\n\n  function schedulePrepare() {\n    window.clearTimeout(prepareTimer);\n    prepareTimer = window.setTimeout(prepareTurns, 120);\n  }\n\n  const sectionAt = (page) => sections.findLast((section) => section.start <= page) ?? sections[0];\n\n',
    "  }\n\n",
  ],
  [
    '    const cover = back || (exists && pageIndex === coverPage());\n    const section = sectionAt(exists ? pageIndex : pageShift);\n    useSection(surface, section);\n    surface.copy.style.visibility = exists && !cover ? "" : "hidden";\n',
    '    const cover = back || (exists && pageIndex === coverPage());\n    surface.copy.style.visibility = exists && !cover ? "" : "hidden";\n',
  ],
  [
    "    surface.copy.style.transform =\n      `translateX(${-(firstVisible - section.start) * (pageWidth + pageGap) - surface.originX}px)`;\n    placeFolio(surface.number, pageIndex, surface.originX);\n",
    "    surface.copy.style.transform =\n      `translateX(${-(firstVisible - pageShift) * (pageWidth + pageGap) - surface.originX}px)`;\n    placeFolio(surface.number, pageIndex, surface.originX);\n",
  ],
  [
    "    surfaces = { g, w, strips, band, under: makeSurface(turnUnder, 0) };\n    schedulePrepare();\n  }\n",
    "    surfaces = { g, w, strips, band, under: makeSurface(turnUnder, 0) };\n  }\n",
  ],
  ["    updateControls();\n    schedulePrepare();\n  }\n", "    updateControls();\n  }\n"],
  [
    "    frontPages = chapterStarts.length ? chapterStarts[0].page : pageCount;\n    // md2book: the page range of each top-level section, for the turn surfaces (makeSurface).\n    sections = [...flow.children].flatMap((el) => {\n      const rects = el.getClientRects();\n      return rects.length ? [{ el, start: pageOf(rects[0]) }] : [];\n    });\n    sections.forEach((section, i) => {\n      section.pages = Math.max(1, (sections[i + 1]?.start ?? pageCount) - section.start);\n    });\n    const page = keep ? mapPage(keep.page, keep.pageCount) : initialPage();\n",
    "    frontPages = chapterStarts.length ? chapterStarts[0].page : pageCount;\n    const page = keep ? mapPage(keep.page, keep.pageCount) : initialPage();\n",
  ],
  [
    "    const target = stackRatios(targetTurn);\n    const { front: frontPage, back: backPage } = turnPages(direction, targetTurn);\n    strips.forEach(({ front, back }) => {\n",
    "    const target = stackRatios(targetTurn);\n    const frontPage = (direction > 0 ? currentStart : targetStart) + pagesPerView - 1;\n    const backPage = two ? (direction > 0 ? targetStart : currentStart) : null;\n    strips.forEach(({ front, back }) => {\n",
  ],
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
