# GitHub Pages

`md2book deploy github-pages` sets up publishing of the
[web edition](editions.md#web-edition) on
[GitHub Pages](https://pages.github.com/). It writes one GitHub Actions
workflow into your repository; the workflow builds the web edition with
`md2book build web` and deploys it each time you push a version tag
(`v1.0.0`, `v1.1.0`, …). Nothing is published before you tag a release.

## Setting it up

The book must be in a git repository hosted on GitHub. From the book's
folder:

```console
$ md2book deploy github-pages
created /home/me/my-book/.github/workflows/md2book-pages.yml
Site URL: the one GitHub Pages reports (set web_url for a custom domain)
Next:
  1. On GitHub: Settings → Pages → Build and deployment → Source: GitHub Actions
  2. Settings → Environments → github-pages → Deployment branches and tags:
     add a tag rule v*
  3. Commit and push the workflow
  4. Tag a release to deploy: git tag v1.0.0 && git push origin v1.0.0
```

Then:

1. In the repository on GitHub, open **Settings → Pages** and set
   **Build and deployment → Source** to **GitHub Actions**.
2. Open **Settings → Environments → github-pages**. Under **Deployment
   branches and tags**, choose **Add deployment branch or tag rule**, pick
   **Tag** and enter `v*`. GitHub creates this environment allowing only
   the default branch, so without the rule a tag's deploy is rejected
   ("not allowed to deploy to github-pages due to environment protection
   rules"). With the GitHub CLI:

   ```console
   $ gh api -X POST repos/<owner>/<repository>/environments/github-pages/deployment-branch-policies -f name='v*' -f type=tag
   ```

3. Commit and push the workflow:

   ```console
   $ git add .github/workflows/md2book-pages.yml
   $ git commit -m "Publish the web edition on GitHub Pages"
   $ git push
   ```

4. Tag a release and push the tag:

   ```console
   $ git tag -a v1.0.0 -m "v1.0.0"
   $ git push origin v1.0.0
   ```

   The **Actions** tab shows the run; when it finishes, it shows the
   site's address.

Tag a new version (`v1.0.1`, `v1.1.0`, …) whenever you want to publish
changes. Pushing commits alone does not deploy.

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

## Other triggers

The workflow runs only when a `v*` tag is pushed. To also deploy each
time you push to `main`, or to start it by hand from the Actions tab,
edit its `on:` section:

```yaml
on:
  push:
    branches: [main]
    tags: ["v*"]
  workflow_dispatch:
```

The `github-pages` environment already allows the default branch, so
deploys from `main` need no extra rule.

## Previewing locally

`md2book serve` serves the site under the path of its URL, as GitHub
Pages does, so a project site can be checked before publishing:

```console
$ md2book serve --web-url https://me.github.io/my-book/
Serving http://127.0.0.1:8000/my-book/ (Ctrl+C to stop)
```

Without `--web-url` it uses `web_url` from `book.json`.
