# Analytics

The web edition can report page views to an analytics service, so you
can see how many people read the book and which chapters they read. It
is **off by default**: a book without `web_analytics` loads nothing from
other servers and sends no data anywhere.

md2book supports four services. Pick the one that fits your readers and
your country's privacy rules:

| Service                                                               | `provider`    | Cookies | Cost                  |
| --------------------------------------------------------------------- | ------------- | ------- | --------------------- |
| [Google Analytics 4](https://analytics.google.com/)                   | `google`      | yes     | free                  |
| [Plausible](https://plausible.io/)                                    | `plausible`   | no      | paid, or self-hosted  |
| [GoatCounter](https://www.goatcounter.com/)                           | `goatcounter` | no      | free for personal use |
| [Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/) | `cloudflare`  | no      | free                  |

## Setting it up

Add one `web_analytics` entry to `book.json`, then rebuild and publish
the web edition:

```json
"web_analytics": { "provider": "goatcounter", "id": "mybook" }
```

```console
$ md2book build web
```

Upload `dist/book/web/` as usual. Only the web edition changes; the
PDF and the EPUB never contain analytics.

### Google Analytics

1. In Google Analytics, create a property and a **Web** data stream for
   the site's address.
2. Copy the stream's **Measurement ID**, which starts with `G-`.
3. Set:

   ```json
   "web_analytics": { "provider": "google", "id": "G-AB12CD34EF" }
   ```

Older Universal Analytics ids (`UA-…`) are not accepted: Google no
longer collects data for them.

### Plausible

1. In Plausible, add the site with the domain readers use, for example
   `book.example.com`.
2. Set `id` to that domain, exactly as registered, without `https://`
   or a trailing slash:

   ```json
   "web_analytics": { "provider": "plausible", "id": "book.example.com" }
   ```

### GoatCounter

1. Sign up at goatcounter.com and choose a **code**: the site becomes
   `https://<code>.goatcounter.com`.
2. Set `id` to that code:

   ```json
   "web_analytics": { "provider": "goatcounter", "id": "mybook" }
   ```

### Cloudflare Web Analytics

1. In the Cloudflare dashboard, open **Web Analytics** and add the site.
2. Cloudflare shows a JavaScript snippet; copy the 32-character
   **token** from it (`"token": "…"`).
3. Set:

   ```json
   "web_analytics": { "provider": "cloudflare", "id": "0123456789abcdef0123456789abcdef" }
   ```

The site does not need to be served through Cloudflare.

## What gets counted

A reader turns pages inside one web page: moving from chapter to
chapter changes the address in the browser without loading a new page.
Analytics services only count page loads by themselves, so md2book
reports each chapter a reader moves to as a page view of that
chapter's address (`/chapters/ch03.html`, …), with the chapter's title.

| Reader action                                              | Page view                                    |
| ---------------------------------------------------------- | -------------------------------------------- |
| Opens the site or a chapter link                           | yes, counted by the service on page load     |
| Turns into the next or an earlier chapter                  | yes, one for the chapter                     |
| Jumps to a chapter from the contents, a bookmark or search | yes, one for the chapter                     |
| Turns pages inside the same chapter                        | no                                           |
| Changes the text size, rotates or resizes the window       | no (the book is laid out again, not read on) |
| Opens a missing page (the 404 page)                        | no, the 404 page has no analytics            |

How each service records the chapter views:

- **Google Analytics** receives a `page_view` event with the chapter's
  address and title.
- **Plausible** loads its manual script: md2book sends the first page
  view and each chapter's.
- **GoatCounter** counts the first page itself; chapter views are sent
  once its script has loaded.
- **Cloudflare** runs in its single-page mode, which watches address
  changes by itself; it offers no way to send page views, so md2book
  only loads it.

## Privacy and consent

- **Cookies.** Google Analytics sets cookies. In the EU, the UK and
  several other countries, cookies for analytics need the reader's
  consent first, which usually means a consent banner; md2book does not
  add one. The other three services use no cookies and generally need
  no banner. Check the rules that apply to your readers.
- **What is sent.** The address and title of the page (or chapter), the
  referrer and what the browser tells every site (browser, language,
  screen size, rough location from the IP address). md2book sends no
  reader text, search terms, bookmarks or reading position.
- **Data stays in the browser.** The reader's position, bookmarks and
  text size are kept in the browser only, as before; analytics never
  sees them.

## Blocked scripts

Many readers use content blockers that stop analytics scripts. The book
reads exactly the same: md2book only calls the service when its script
has loaded, and simply skips the page view otherwise. Expect the counts
to be lower than the real number of readers, most of all for Google
Analytics.

## Checking that it works

1. Open the published site in a normal browser window (not one with a
   content blocker).
2. Open the service's live or real-time view: Google Analytics
   **Realtime**, Plausible's dashboard, GoatCounter's dashboard or
   Cloudflare's Web Analytics page.
3. Turn into another chapter; within a minute the chapter's address
   appears.

Pages opened from `md2book serve` on `127.0.0.1` are sent too, but most
services ignore or filter out local addresses.

## Checks and errors

`web_analytics` is checked before any build. A wrong entry stops the
command with one line saying what is expected:

| Mistake                                | Message                                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Unknown provider                       | `web_analytics.provider: must be one of google, plausible, goatcounter, cloudflare`             |
| No id                                  | `web_analytics.id: required key missing`                                                        |
| Google id not in the `G-…` form        | `web_analytics.id: must be a Google Analytics measurement id like G-XXXXXXXXXX`                 |
| Plausible id with `https://` or a path | `web_analytics.id: must be the site's domain as registered in Plausible, like book.example.com` |
| GoatCounter id not a site code         | `web_analytics.id: must be the GoatCounter site code (the name in <code>.goatcounter.com)`      |
| Cloudflare token not 32 characters     | `web_analytics.id: must be the 32-character Cloudflare Web Analytics token`                     |

## Turning it off

Remove `web_analytics` from `book.json` and rebuild: the pages are
exactly as they were without it.
