# Contributing to md2book

Thank you for helping. Bug reports, fixes and small improvements are welcome.

## Before you start

- For a bug, open an issue with the bug report template, including the smallest book that shows it.
- For a new feature or config key, open a feature request first so we can agree on the behaviour
  before you write code. md2book keeps its surface small on purpose.

## Setup

```console
$ git clone https://github.com/thixpin/md2book.git
$ cd md2book
$ nvm use
$ npm install
$ npx playwright install chromium webkit
```

Node.js 26 or newer is required. The EPUB tests use
[epubcheck](https://www.w3.org/publishing/epubcheck/) when it is on your PATH.

## Making a change

1. Write a failing test first, then the change that makes it pass. Tests never use the network;
   they use the small fonts in `test/fixtures/`.
2. Keep changes small and focused; follow the style of the code around them.
3. Do not change the output of an existing edition without a reason. Deliberate differences from
   the original Python toolchain are recorded in [`specs/decision-log.md`](specs/decision-log.md).
4. Run the checks:

   ```console
   $ npm run check
   $ npm run coverage
   $ npm run test:e2e
   ```

   `check` runs the type checker, ESLint, Prettier and the tests; `coverage` must stay above the
   thresholds in `vitest.config.ts`; `test:e2e` runs the web reader in Chromium and WebKit.
   Performance and load tests (build times, the reader on a long book) are slow and run only on
   demand, when a change may affect speed or memory: `npm run test:perf`. CI runs them on pull
   requests and version tags, and a release is published only after they pass.

## Commits and pull requests

- Use single-line [Conventional Commits](https://www.conventionalcommits.org/), for example
  `fix(pdf): keep a heading with two lines of its content`.
- Open the pull request against `master` and describe what changed and how you tested it. CI runs
  the same checks on every pull request.

## Releases

Maintainers release by bumping `version` in `package.json` and pushing a matching `v<version>`
tag; CI checks the tag, installs the packed package and publishes it with npm provenance.

## Licence

By contributing you agree that your contribution is licensed under the MIT licence of this
project.
