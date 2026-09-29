# Implementation Plan: Cover Rendering and npm Packaging

**Branch**: `005-cover-and-packaging` (feature directory; no git branch, work is on `master`) |
**Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/005-cover-and-packaging/spec.md`; reference `development-book/publish/
render_cover.py` at `d235dbd`; plan-input rows for `render_cover` and CI.

## Summary

Add `md2book cover` (a one-page HTML cover rendered to PNG in Chromium with the book's fonts,
exact pixel size from the `@page` rule), make the package publishable as `@thixpin/md2book@0.1.0`
(file allow-list, install check from the packed tarball), run CI on pull requests and tags with a tag-only release job
that publishes with provenance, and add a complete demo book under `examples/demo-book/`.

## Technical Context

**Language/Version**: TypeScript 6.0 on Node.js 26+ (unchanged).

**Primary Dependencies**: existing only: `playwright` (render), `pdf-lib` (page count and
fallback size), `sharp` (exact resize); no new runtime dependency.

**Storage**: files: the cover PNG; `npm pack` tarballs in temp dirs.

**Testing**: Vitest unit and integration (Chromium, offline, print font fixture); the package check
script (network only for installing dependencies); GitHub Actions on tags.

**Target Platform**: macOS/Linux; npm registry.

**Performance Goals**: a cover renders in < 10 s on CI (SC-005).

**Constraints**: no network while rendering; sources read-only; no secrets in the repository.

**Scale/Scope**: one cover per run; one package.

No NEEDS CLARIFICATION items remain; see [research.md](./research.md).

## Constitution Check

| Principle | Gate | Status |
|---|---|---|
| I. Equivalence | `cover` ports `render_cover.py`: same defaults (cover.png next to the HTML, 300 dpi), one-page rule and message; pixel size equals the reference PNG for `book-01` (SC-001); visual review (SC-002). | Pass |
| II. Read-only manuscript | Reads the HTML folder; writes only the PNG. | Pass |
| III. Complex scripts | Book fonts injected under the book's family names; Burmese fixture cover tested. | Pass |
| IV. Fail loudly | One-line errors for every failure (contract); no partial PNG. | Pass |
| VI. Test-first | Tests precede each module; rendering tests offline. | Pass |
| VII. Deterministic | Same HTML and fonts → same PNG bytes (tested). | Pass |
| VIII. Small surface | `cover()` only; no new config keys. | Pass |
| Development workflow | CI checks on pull requests and tags, publish on tags only (author decision); the merge gate is `npm run check` locally plus the pull-request checks. | Pass |

## Project Structure

```text
src/cover/
├── page-size.ts     # @page size string → points (units and named sizes)
├── render.ts        # renderCover(): serve folder + fonts, count pages, screenshot, resize
└── command.ts       # runCover (CLI and API)
src/cli.ts           # `cover` becomes a real command
src/index.ts         # + cover()
scripts/package-check.ts   # pack, install into a temp project, run the CLI
package.json         # version 0.1.0, keywords, publishConfig, prepublishOnly, package:check
.github/workflows/ci.yml   # pull requests + tags: check, browser; tags: release (provenance)
examples/demo-book/  # complete example book (not published)
test/unit/cover/, test/integration/cover.test.ts, test/unit/package-files.test.ts
test/fixtures/cover/       # small Burmese cover HTML with a local image
```

**Structure Decision**: `src/cover` beside the other editions; the package check is a maintainer
script like the equivalence scripts, run by the release job.

## Complexity Tracking

No violations.
