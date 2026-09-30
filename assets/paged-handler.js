/* global Paged, document */
// md2book: marks each chapter's first page, whose header and folio assets/css/paged.css hides
// (Paged.js does not support `@page chapter-a:nth(1 of chapter-a)`), and writes the folios.
class ChapterFirstPage extends Paged.Handler {
  afterPageLayout(page) {
    if (page.querySelector(".chapter-head")) page.classList.add("chapter-first");
  }
}

// Page numbers start at 1 on chapter one's first page, in the book's digits (body
// data-folio-digits). A `counter-reset` on that page does not carry over to the following page
// boxes in Chromium, so each page gets its number as --md2book-folio, which the folio margin
// boxes show. Counted like the contents' target-counter: every page from chapter one on.
class Folios extends Paged.Handler {
  afterRendered(pages) {
    const myanmar = document.body.dataset.folioDigits === "myanmar";
    const digits = (n) =>
      myanmar
        ? String(n).replace(/[0-9]/g, (d) => String.fromCharCode(0x1040 + Number(d)))
        : String(n);
    const first = pages.findIndex((page) =>
      page.element.querySelector("#ch01:not([data-split-from])"),
    );
    if (first === -1) return;
    pages.slice(first).forEach((page, i) => {
      page.element.style.setProperty("--md2book-folio", JSON.stringify(digits(i + 1)));
    });
  }
}
// A section heading must not end a page with none of the block that follows it (spec 004 US5,
// spec 006). `break-after: avoid` only works when Paged.js finds the overflow at that block
// itself; when the block's box fits but its first line does not (a code block's padding, say),
// the overflow starts inside it and the heading is left alone at the page foot. Then the break
// moves to just before the heading, unless the heading already opens the page.
class KeepHeadingsWithContent extends Paged.Handler {
  onOverflow(overflow, rendered) {
    if (!overflow) return undefined;
    const start = overflow.startContainer;
    const node = start.nodeType === 1 ? (start.childNodes[overflow.startOffset] ?? start) : start;
    let block = node.nodeType === 1 ? node : node.parentElement;
    while (block && block.parentElement && !block.previousElementSibling)
      block = block.parentElement;
    for (; block && block !== rendered; block = block.parentElement) {
      const heading = block.previousElementSibling;
      if (!heading || !/^H[2-6]$/.test(heading.tagName)) continue;
      const kept = document.createRange();
      kept.setStartBefore(block);
      kept.setEnd(overflow.startContainer, overflow.startOffset);
      if (kept.toString().trim()) return undefined;
      const before = document.createRange();
      before.setStart(rendered, 0);
      before.setEndBefore(heading);
      if (!before.toString().trim()) return undefined;
      const moved = overflow.cloneRange();
      moved.setStartBefore(heading);
      return moved;
    }
    return undefined;
  }
}

Paged.registerHandlers(ChapterFirstPage, Folios, KeepHeadingsWithContent);
