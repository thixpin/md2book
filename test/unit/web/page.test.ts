import { describe, expect, it } from "vitest";
import { page } from "../../../src/web/page.ts";
import { testConfig } from "../../helpers/config.ts";
import { attr, find } from "../../helpers/html.ts";
import { tempDir } from "../../helpers/temp.ts";

const config = (extra: object = {}) =>
  testConfig(tempDir(), { title: "Book & Co", author: "A", subtitle: "Sub", ...extra });

const meta = (html: string, key: string) =>
  find(
    html,
    (el) => el.tagName === "meta" && (attr(el, "property") ?? attr(el, "name")) === key,
  ).map((el) => attr(el, "content"));
const links = (html: string, rel: string) =>
  find(html, (el) => el.tagName === "link" && attr(el, "rel") === rel).map((el) =>
    attr(el, "href"),
  );

function build(extra: object, path: string | null, ogType?: "book" | "article", favicon = false) {
  return page(config(extra), {
    title: "T",
    content: "<p>x</p>",
    description: "D",
    stylesheet: "style.abc.css",
    script: path ? "reader.abc.js" : undefined,
    path,
    ogType,
    favicon,
  });
}

describe("page head", () => {
  it("writes Open Graph and Twitter tags", () => {
    const html = build({}, "/", "book");
    expect(meta(html, "og:type")).toEqual(["book"]);
    expect(meta(html, "og:site_name")).toEqual(["Book & Co"]);
    expect(meta(html, "og:title")).toEqual(["T"]);
    expect(meta(html, "og:description")).toEqual(["D"]);
    expect(meta(html, "og:image")).toEqual(["/og-image.png"]);
    expect(meta(html, "og:image:width")).toEqual(["1200"]);
    expect(meta(html, "og:image:height")).toEqual(["630"]);
    expect(meta(html, "og:image:alt")).toEqual(["Book & Co cover"]);
    expect(meta(html, "twitter:card")).toEqual(["summary_large_image"]);
    expect(meta(html, "description")).toEqual(["D"]);
  });

  it("uses article for chapter pages", () => {
    expect(meta(build({}, "/chapters/ch01.html", "article"), "og:type")).toEqual(["article"]);
  });

  it("adds canonical and og:url only with web_url", () => {
    const withUrl = build({ web_url: "https://book.example/" }, "/chapters/ch01.html", "article");
    expect(links(withUrl, "canonical")).toEqual(["https://book.example/chapters/ch01.html"]);
    expect(meta(withUrl, "og:url")).toEqual(["https://book.example/chapters/ch01.html"]);
    expect(meta(withUrl, "og:image")).toEqual(["https://book.example/og-image.png"]);
    const without = build({}, "/", "book");
    expect(links(without, "canonical")).toEqual([]);
    expect(meta(without, "og:url")).toEqual([]);
  });

  it("marks the 404 page noindex, without canonical or script", () => {
    const html = build({ web_url: "https://book.example" }, null);
    expect(meta(html, "robots")).toEqual(["noindex"]);
    expect(links(html, "canonical")).toEqual([]);
    expect(find(html, (el) => el.tagName === "script")).toEqual([]);
  });

  it("links the favicons only when configured", () => {
    expect(links(build({}, "/", "book", true), "icon")).toEqual([
      "/favicon.svg",
      "/favicon-32.png",
    ]);
    expect(links(build({}, "/", "book", true), "apple-touch-icon")).toEqual([
      "/apple-touch-icon.png",
    ]);
    expect(links(build({}, "/", "book", false), "icon")).toEqual([]);
  });
});
