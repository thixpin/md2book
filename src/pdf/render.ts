import { chromium, type Browser } from "playwright";
import { BookError } from "../errors.ts";

export interface ServedFile {
  body: string | Buffer;
  type: string;
}

export interface RenderInput {
  /** The print document: sets `window.PagedConfig = { auto: false }` and loads
   *  `/pagedjs/paged.polyfill.js`. */
  html: string;
  /** Every other path the document may request, by absolute path on the virtual origin. */
  files: Record<string, ServedFile>;
  /** Paged.js layout limit. */
  timeoutMs?: number;
  /** Test-only: how to start Chromium. */
  launch?: () => Promise<Browser>;
}

const ORIGIN = "http://md2book.local";

/**
 * Lays out the document with Paged.js in headless Chromium and prints it (research R-01, R-09).
 * Nothing leaves the process: every request is answered from `files`, and any other request
 * fails the build. The fonts load before Paged.js starts, so it measures with the book's fonts;
 * the layout is complete when `preview()` resolves (its `after` hook can fire earlier).
 */
export async function renderPdf({
  html,
  files,
  timeoutMs = 600_000,
  launch = () => chromium.launch(),
}: RenderInput): Promise<Uint8Array> {
  let browser: Browser;
  try {
    browser = await launch();
  } catch {
    throw new BookError("pdf", "Chromium is not installed; run: npx playwright install chromium");
  }
  let timer: NodeJS.Timeout | undefined;
  try {
    const page = await browser.newPage();
    const unexpected: string[] = [];
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      const path = decodeURIComponent(url.pathname);
      if (url.origin === ORIGIN && path === "/index.html") {
        return route.fulfill({ body: html, contentType: "text/html; charset=utf-8" });
      }
      const file = url.origin === ORIGIN ? files[path] : undefined;
      if (!file) {
        unexpected.push(url.origin === ORIGIN ? path : url.href);
        return route.abort();
      }
      return route.fulfill({ body: file.body, contentType: file.type });
    });
    const check = () => {
      if (unexpected.length) throw new BookError("pdf", `unexpected request ${unexpected[0]}`);
    };

    await page.goto(`${ORIGIN}/index.html`);
    check();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.fonts].map((face) => face.load()));
    });
    const layout = page.evaluate(async () => {
      await (
        window as unknown as { PagedPolyfill: { preview(): Promise<unknown> } }
      ).PagedPolyfill.preview();
    });
    const limit = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new BookError("pdf", "page layout did not finish")),
        timeoutMs,
      );
    });
    await Promise.race([layout, limit]);
    check();
    return new Uint8Array(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
  } finally {
    clearTimeout(timer);
    await browser.close();
  }
}
