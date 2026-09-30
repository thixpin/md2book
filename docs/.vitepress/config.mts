import { defineConfig } from "vitepress";

const repo = "https://github.com/thixpin/md2book";

export default defineConfig({
  title: "md2book",
  description:
    "Turn a Markdown book manuscript into a print-ready PDF, an EPUB 3, a web edition and a QA report, with first-class Myanmar (Burmese) support.",
  // Served from GitHub Pages on its own domain, https://md2book.thixpin.me/ (the account's
  // github.io project paths redirect to thixpin.me, which is not on GitHub Pages).
  base: "/",
  cleanUrls: true,
  // docs/README.md is the index when browsing docs/ on GitHub; index.md is the site's home.
  srcExclude: ["README.md"],
  // The open-book icon md2book gives web editions (src/web/images.ts), in the site's brand colour.
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    ["link", { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" }],
    ["link", { rel: "apple-touch-icon", href: "/apple-touch-icon.png" }],
  ],
  themeConfig: {
    nav: [
      { text: "Guide", link: "/getting-started" },
      { text: "Reference", link: "/commands" },
      { text: "npm", link: "https://www.npmjs.com/package/@thixpin/md2book" },
    ],
    sidebar: [
      {
        text: "Guides",
        items: [
          { text: "Getting started", link: "/getting-started" },
          { text: "Writing chapters", link: "/writing" },
          { text: "Markdown syntax", link: "/markdown" },
          { text: "Covers", link: "/cover" },
          { text: "Usage examples", link: "/examples" },
          { text: "Analytics", link: "/analytics" },
          { text: "GitHub Pages", link: "/github-pages" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "Commands", link: "/commands" },
          { text: "Configuration", link: "/configuration" },
          { text: "Editions", link: "/editions" },
          { text: "Fonts", link: "/fonts" },
          { text: "Programmatic API", link: "/api" },
        ],
      },
    ],
    outline: [2, 3],
    search: { provider: "local" },
    socialLinks: [{ icon: "github", link: repo }],
    editLink: { pattern: `${repo}/edit/master/docs/:path`, text: "Edit this page on GitHub" },
    footer: { message: "Released under the MIT Licence." },
  },
});
