/* global Paged */
// md2book: marks each chapter's first page, whose header and folio assets/css/paged.css hides
// (Paged.js does not support `@page chapter-a:nth(1 of chapter-a)`).
class ChapterFirstPage extends Paged.Handler {
  afterPageLayout(page) {
    if (page.querySelector(".chapter-head")) page.classList.add("chapter-first");
  }
}
Paged.registerHandlers(ChapterFirstPage);
