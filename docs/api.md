# Programmatic API

`@thixpin/md2book` exports one async function per command, for build
scripts and other tools. It is an ES module with TypeScript types.

```console
$ npm install @thixpin/md2book
$ npx playwright install chromium
```

```ts
import { all, cover, fonts, init, pdf, web } from "@thixpin/md2book";

await init({ dir: "my-book", lang: "en", title: "T", author: "A" });
await cover({ html: "my-book/cover/cover.html", config: "my-book/book.json" });
await fonts({ config: "my-book/book.json" });
const { dir } = await web({ config: "my-book/book.json" });
const { file } = await pdf({ config: "my-book/book.json", printed: true });
const { report } = await all({ config: "my-book/book.json" });
```

Unlike the CLI, `pdf`, `epub`, `web`, `serve`, `qa` and `all` need
`config`; only `fonts` and `cover` default to `book.json` in the current
folder. Relative paths, including the default output folder
`dist/<config name>/`, are resolved against `process.cwd()`.

## Functions

| Function         | Options        | Resolves to                                                                              |
| ---------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `init(options)`  | `InitOptions`  | `{ files }`: the files written                                                           |
| `fonts(options)` | `FontsOptions` | `{ dir, files }`: the set's cache folder and files                                       |
| `cover(options)` | `CoverOptions` | `{ file, width, height }`: the PNG and its size in px                                    |
| `pdf(options)`   | `PdfOptions`   | `{ file }`: the PDF                                                                      |
| `epub(options)`  | `EpubOptions`  | `{ file }`: the EPUB                                                                     |
| `web(options)`   | `WebOptions`   | `{ dir, chapters }`: the site folder and chapter count                                   |
| `serve(options)` | `ServeOptions` | `Served`: `{ url, port, close() }`                                                       |
| `qa(options)`    | `QaOptions`    | `{ file }`: `QA-REPORT.md`                                                               |
| `all(options)`   | `QaOptions`    | `{ pdf, epub, web?, report }`: the files written; `web` only when chapters are published |

## Options

```ts
interface InitOptions {
  dir?: string; // default: the current folder
  lang: string; // "my", "mm", "myanmar", "en" or "english"
  font?: string; // "sans" (default) or "serif"
  title: string;
  author: string;
}

interface FontsOptions {
  config?: string; // default "book.json", unless `set` is given
  set?: string; // "my-sans", "my-serif", "en-sans" or "en-serif"
  fontsDir?: string; // cache root; overrides MD2BOOK_FONTS
}

interface CoverOptions {
  html: string; // the cover HTML
  output?: string; // default: cover.png next to the HTML
  dpi?: number; // 1–1200, default 300
  config?: string; // default "book.json", unless `set` is given
  set?: string; // font set instead of a config
  fontsDir?: string;
}

interface PdfOptions {
  config: string;
  out?: string; // default dist/<config name>/
  printed?: boolean; // the print-shop interior
}

interface EpubOptions {
  config: string;
  out?: string;
}

interface WebOptions {
  config: string;
  out?: string; // the site goes to <out>/web/
  webUrl?: string; // the site's public URL for this build, in place of web_url
}

interface ServeOptions extends WebOptions {
  port?: number; // on 127.0.0.1, default 8000; 0 picks a free port
}

interface QaOptions extends EpubOptions {
  printed?: boolean; // check (for `all`, also build) the printed PDF
}
```

## Errors

A problem the user can fix (a bad config, a missing file, fonts not
fetched) rejects with an `Error` whose message is the same one line the
CLI prints, for example
`md2book: /work/book.json: cannot read config file`.

## Serving

`serve` resolves once the site is listening. Call `close()` to stop it:

```ts
import { serve } from "@thixpin/md2book";

const site = await serve({ config: "book.json", port: 0 });
console.log(site.url); // http://127.0.0.1:<port>/
await site.close();
```
