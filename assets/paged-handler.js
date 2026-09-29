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
Paged.registerHandlers(ChapterFirstPage, Folios);
