// Opt-in web analytics (`web_analytics`): the provider's tag in the page head and the glue that
// turns the reader's chapter changes (md2book:pageview) into page views.
import { describe, expect, it } from "vitest";
import { defaultStrings } from "../../../src/config/language.ts";
import { analyticsHead } from "../../../src/web/analytics.ts";
import { page } from "../../../src/web/page.ts";
import { testConfig } from "../../helpers/config.ts";
import { tempDir } from "../../helpers/temp.ts";

const strings = defaultStrings("en", "sans");
const context = { book: "Book & Co", chapter: "ch02", chapterTitle: "Loops" };

const html = (web_analytics?: Parameters<typeof analyticsHead>[0]) =>
  page(testConfig(tempDir(), web_analytics ? { web_analytics } : {}), {
    title: "T",
    content: "<p>x</p>",
    description: "D",
    stylesheet: "style.abc.css",
    script: "reader.abc.js",
    path: "/",
  });

describe("web analytics", () => {
  it("adds nothing without web_analytics", () => {
    expect(analyticsHead(undefined, strings, context)).toBe("");
    expect(html()).not.toMatch(
      /googletagmanager|plausible|goatcounter|cloudflareinsights|md2book:pageview/,
    );
  });

  it("loads Google Analytics (gtag) and sends a page_view for each chapter change", () => {
    const head = analyticsHead({ provider: "google", id: "G-AB12CD34EF" }, strings, context);
    expect(head).toContain(
      '<script async src="https://www.googletagmanager.com/gtag/js?id=G-AB12CD34EF"></script>',
    );
    expect(head).toContain('gtag("config", "G-AB12CD34EF", {');
    expect(head).toContain(
      'gtag("event", "page_view", { page_location: location.origin + detail.path, page_title: detail.title, domain:',
    );
  });

  it("loads Plausible's manual script and counts the first page and each chapter change", () => {
    const head = analyticsHead({ provider: "plausible", id: "book.example.com" }, strings, context);
    expect(head).toContain(
      '<script defer data-domain="book.example.com" src="https://plausible.io/js/script.manual.js"></script>',
    );
    expect(head).toContain('plausible("pageview", { props: {');
    expect(head).toContain('plausible("pageview", { u: location.origin + detail.path, props: {');
  });

  it("loads GoatCounter and counts each chapter change when it is available", () => {
    const head = analyticsHead({ provider: "goatcounter", id: "mybook" }, strings, context);
    expect(head).toContain(
      '<script data-goatcounter="https://mybook.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>',
    );
    expect(head).toContain(
      "window.goatcounter?.count?.({ path: detail.path, title: detail.title });",
    );
  });

  it("loads Cloudflare Web Analytics in its single-page mode", () => {
    const head = analyticsHead(
      { provider: "cloudflare", id: "0123456789abcdef0123456789abcdef" },
      strings,
      context,
    );
    expect(head).toContain(
      `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"0123456789abcdef0123456789abcdef","spa":true}'></script>`,
    );
  });

  it("puts the tags in the page head, after the stylesheet", () => {
    const out = html({ provider: "google", id: "G-AB12CD34EF" });
    expect(out.indexOf("googletagmanager")).toBeGreaterThan(out.indexOf("style.abc.css"));
    expect(out.indexOf("googletagmanager")).toBeLessThan(out.indexOf("</head>"));
  });
});

describe("Google Analytics with a consent banner", () => {
  const head = analyticsHead(
    { provider: "google", id: "G-AB12CD34EF", consent: true },
    strings,
    context,
  );

  it("loads nothing of Google's in the page; the script loads it after the reader agrees", () => {
    expect(head).not.toContain('<script async src="https://www.googletagmanager.com');
    expect(head).toContain('const ID = "G-AB12CD34EF";');
    expect(head).toContain('tag.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;');
    expect(head).toContain('const KEY = "md2book:analytics-consent";');
  });

  it("writes the banner's words from strings, so no text can close the script", () => {
    const text = { ...strings.consent, message: "We count readers </script><b>" };
    const custom = analyticsHead(
      { provider: "google", id: "G-AB12CD34EF", consent: true },
      { consent: text },
      context,
    );
    expect(custom).toContain('"agree":"Agree","decline":"Decline","settings":"Cookie settings"');
    expect(custom).toContain("We count readers \\u003c/script>\\u003cb>");
    expect(custom.match(/<\/script>/g)).toHaveLength(1);
  });

  it("is the same as without consent when consent is false", () => {
    expect(
      analyticsHead({ provider: "google", id: "G-AB12CD34EF", consent: false }, strings, context),
    ).toBe(analyticsHead({ provider: "google", id: "G-AB12CD34EF" }, strings, context));
  });
});

describe("what a page view says", () => {
  it("sends the domain, book, chapter and chapter title to Google Analytics", () => {
    const head = analyticsHead({ provider: "google", id: "G-AB12CD34EF" }, strings, context);
    expect(head).toContain(
      'gtag("config", "G-AB12CD34EF", { domain: location.hostname, book: "Book & Co", chapter: "ch02", chapter_title: "Loops" });',
    );
    expect(head).toContain(
      'domain: location.hostname, book: "Book & Co", chapter: detail.chapter, chapter_title: detail.chapterTitle',
    );
  });

  it("sends them behind the consent banner too", () => {
    const head = analyticsHead(
      { provider: "google", id: "G-AB12CD34EF", consent: true },
      strings,
      context,
    );
    expect(head).toContain('const BOOK = "Book & Co";');
    expect(head).toContain('const PAGE = {"chapter":"ch02","chapter_title":"Loops"};');
    expect(head).toContain(
      'gtag("config", ID, { domain: location.hostname, book: BOOK, ...PAGE });',
    );
    expect(head).toContain("chapter: detail.chapter, chapter_title: detail.chapterTitle");
  });

  it("sends them to Plausible as custom properties", () => {
    const head = analyticsHead({ provider: "plausible", id: "book.example.com" }, strings, context);
    expect(head).toContain(
      'plausible("pageview", { props: { domain: location.hostname, book: "Book & Co", chapter: "ch02", chapter_title: "Loops" } });',
    );
    expect(head).toContain("u: location.origin + detail.path, props: { domain: location.hostname");
  });

  it("keeps a book title from closing the script", () => {
    const head = analyticsHead({ provider: "google", id: "G-AB12CD34EF" }, strings, {
      ...context,
      book: "</script><b>",
    });
    expect(head).toContain('book: "\\u003c/script>\\u003cb>"');
  });
});
