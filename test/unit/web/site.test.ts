import { describe, expect, it } from "vitest";
import { robotsTxt, site, sitemapXml } from "../../../src/web/site.ts";
import { testConfig } from "../../helpers/config.ts";
import { tempDir } from "../../helpers/temp.ts";

const siteOf = (web_url?: string) => site(testConfig(tempDir(), { web_url }));

describe("site", () => {
  it("is served at the root of its domain by default", () => {
    expect(siteOf()).toEqual({ base: "", root: "" });
    expect(siteOf("https://book.example.com/")).toEqual({
      base: "https://book.example.com",
      root: "",
    });
  });

  it("takes the path of web_url, as for GitHub project Pages", () => {
    expect(siteOf("https://owner.github.io/my-book/")).toEqual({
      base: "https://owner.github.io/my-book",
      root: "/my-book",
    });
    expect(siteOf("https://owner.github.io/my-book").root).toBe("/my-book");
  });

  it("keeps links root-relative for a web_url that is not an absolute URL", () => {
    expect(siteOf("book.example.com/").root).toBe("");
  });
});

describe("robotsTxt", () => {
  it("allows every page and names the sitemap when there is one", () => {
    expect(robotsTxt("https://book.example.com/sitemap.xml")).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://book.example.com/sitemap.xml\n",
    );
    expect(robotsTxt(null)).toBe("User-agent: *\nAllow: /\n");
  });
});

describe("sitemapXml", () => {
  it("lists the absolute URL of each page, without dates", () => {
    expect(sitemapXml("https://owner.github.io/b", ["/", "/chapters/ch01.html"])).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        "  <url><loc>https://owner.github.io/b/</loc></url>\n" +
        "  <url><loc>https://owner.github.io/b/chapters/ch01.html</loc></url>\n" +
        "</urlset>\n",
    );
  });

  it("escapes XML characters", () => {
    expect(sitemapXml("https://e.com/a&b", ["/"])).toContain("<loc>https://e.com/a&amp;b/</loc>");
  });
});
