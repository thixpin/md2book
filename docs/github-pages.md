# GitHub Pages

`md2book deploy github-pages` sets up publishing of the
[web edition](editions.md#web-edition) on
[GitHub Pages](https://pages.github.com/). It writes one GitHub Actions
workflow into your repository; the workflow builds the web edition with
`md2book build web` and deploys it. Nothing is published until you run
the workflow yourself.

## Setting it up

The book must be in a git repository hosted on GitHub. From the book's
folder:

```console
$ md2book deploy github-pages
created /home/me/my-book/.github/workflows/md2book-pages.yml
Site URL: the one GitHub Pages reports (set web_url for a custom domain)
Next:
  1. On GitHub: Settings → Pages → Build and deployment → Source: GitHub Actions
  2. Commit and push the workflow
  3. Actions → "Deploy web edition to GitHub Pages" → Run workflow
```

Then:

1. In the repository on GitHub, open **Settings → Pages** and set
   **Build and deployment → Source** to **GitHub Actions**.
2. Commit and push the workflow:

   ```console
   $ git add .github/workflows/md2book-pages.yml
   $ git commit -m "Publish the web edition on GitHub Pages"
   $ git push
   ```

3. Open the **Actions** tab, choose **Deploy web edition to GitHub
   Pages** and click **Run workflow**. When it finishes, the run shows
   the site's address.

Run the workflow again whenever you want to publish changes.

| Option                | Effect                                                    |
| --------------------- | --------------------------------------------------------- |
| `-c, --config <path>` | the book's config (default `book.json`)                   |
| `-f, --force`         | replace an existing `.github/workflows/md2book-pages.yml` |

The workflow is written at the root of the repository, even when the
book is in a subfolder; it then builds the book in that folder. An
existing workflow is never replaced without `--force`, and outside a git
repository the command stops.

## What the workflow does

On a GitHub-hosted Ubuntu runner it:

1. installs the same md2book version that wrote the workflow, and the
   Chromium it uses;
2. fetches the book's fonts (`md2book fonts`);
3. builds the web edition (`md2book build web`) into `dist/pages/web/`;
4. uploads that folder and deploys it to GitHub Pages.

Only the chapters in `web_published_chapters` are published, as with
any web build. The PDF and EPUB are not built.

## The site's address

The web edition needs the site's public URL for its canonical and share
links, `robots.txt` and `sitemap.xml`
([Editions: web edition](editions.md#web-edition)).

- **Without `web_url`**, the workflow uses the address GitHub Pages
  reports, and passes it to the build with `--web-url`:
  - a project site is `https://<owner>.github.io/<repository>/`; the
    web edition is built for that path, so its links, the reader's
    addresses and the sitemap all start with `/<repository>/`;
  - a repository named `<owner>.github.io` is served at the root,
    `https://<owner>.github.io/`;
  - a custom domain set in **Settings → Pages → Custom domain** is used
    as it is.
- **With `web_url`** in `book.json`, the workflow builds with it as it
  is. Use this for a custom domain you want fixed in the book:

  ```json
  "web_url": "https://book.example.com/"
  ```

  Set the same domain in **Settings → Pages → Custom domain** and at
  your DNS provider (see GitHub's
  [custom domain guide](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)).
  `web_url` must match where the site is served: for a project site
  without a custom domain it is `https://<owner>.github.io/<repository>/`.

The choice is made when the workflow is written: after adding, changing
or removing `web_url`, run `md2book deploy github-pages --force` again.

Search engines read `robots.txt` only at the root of a domain, so on a
project site (`/<repository>/robots.txt`) it is not used; submit
`https://<owner>.github.io/<repository>/sitemap.xml` in Google Search
Console or Bing Webmaster Tools instead.

## Deploying on every push

The workflow runs only when you start it. To deploy each time you push
to `main`, edit its `on:` section:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

## Previewing locally

`md2book serve` serves the site under the path of its URL, as GitHub
Pages does, so a project site can be checked before publishing:

```console
$ md2book serve --web-url https://me.github.io/my-book/
Serving http://127.0.0.1:8000/my-book/ (Ctrl+C to stop)
```

Without `--web-url` it uses `web_url` from `book.json`.
