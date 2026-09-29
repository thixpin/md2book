# Quickstart: Cover Rendering and npm Packaging

```console
$ md2book cover examples/demo-book/cover/cover.html --config examples/demo-book/book.json
Cover written: examples/demo-book/cover/cover.png (2008 x 2835 px, 300 dpi)
$ npm run package:check
```

Expected: the demo cover PNG shows the Burmese title in the book font; the package check lists
the allowed files only and builds the demo book's EPUB from the installed tarball.

Release (maintainer, after adding `NPM_TOKEN` to the repository secrets):

```console
$ git tag v0.1.0 && git push origin v0.1.0
```
