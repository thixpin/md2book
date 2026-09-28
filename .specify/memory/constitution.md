# @thixpin/md2book Constitution

## Core Principles

### I. Behavioural Equivalence First

The package replaces a working Python toolchain (`development-book/publish/` at commit
`d235dbd`). Until v1.0 the acceptance bar is that the same manuscript MUST produce an
equivalent book:

- the same page geometry, page count (within a stated tolerance) and chapter opening
  pages;
- the same EPUB structure and text;
- the same web edition markup and reader behaviour.

Any deliberate difference MUST be recorded in a decision log together with its reason.

Rationale: the existing toolchain is the proven reference; unrecorded drift makes the port
unverifiable.

### II. The Manuscript Is Read-Only

- The tool MUST NOT rewrite, reformat or "fix" author source files.
- Changes needed for layout, such as syllable-break characters or Unicode normalisation,
  MUST happen only in generated output.
- The QA report MUST point out source issues and MUST NOT correct them.

### III. Complex Scripts Are First-Class

- Myanmar text MUST shape correctly.
- Myanmar text MUST break lines only at syllable boundaries.
- Myanmar text MUST copy and search out of the PDF with no replacement characters and no
  stray glyph-ID letters.
- Any engine or library change MUST pass the Burmese checks in the QA report before it is
  accepted.

Rationale: the package was first built for Burmese technical books; complex-script
correctness is a core requirement, not a nice-to-have.

### IV. Fail Loudly on Bad Input

A missing cover, a missing snippet file or region, a malformed chapter heading or an
unlisted web chapter MUST stop the build with a message naming the file. The tool MUST NOT
silently skip content or produce a partial book.

### V. Drafts Never Leak

- The web edition MUST publish only chapters that are explicitly allow-listed.
- An end image MUST stay withheld until its gate chapter exists.
- Draft chapters MUST NOT be loaded into any public output by any code path.

### VI. Test-First (NON-NEGOTIABLE)

- Every functional requirement MUST have an automated test written before the
  implementation.
- Tests MUST use small fixture books in the repository, including a Burmese fixture.
- Tests MUST NOT need network access. Font download and the Playwright browser install are
  the only steps that may use the network.

### VII. Deterministic, Reproducible Output

- Hashed asset names (stylesheet, reader script) MUST depend only on content.
- Output directories MUST be cleaned and rebuilt, never patched.
- The only timestamps an output may contain are the EPUB `dcterms:modified` value and the
  QA report's generation time.

### VIII. Small Surface, No Speculative Extensibility

- The package MUST expose exactly one CLI (`book-build`) and one programmatic API that mirrors
  it.
- There MUST be no plugin system or theme engine until a real second consumer needs one.
- Series-specific strings MUST be configuration with the current values as defaults. They
  MUST NOT be hard-coded, and they MUST NOT grow into a framework.

### IX. Accessible, Standards-Based Web Output

- Web pages MUST be semantic HTML. Text MUST NOT be shown as an image or on a canvas.
- Browser Find, text selection, screen readers, keyboard navigation and
  `prefers-reduced-motion` MUST keep working.
- The reader MUST work without `localStorage`.

## Engineering Standards

- TypeScript `strict`, ESM, Node.js 26+.
- Vitest for tests; ESLint and Prettier for linting and formatting.
- Code lines in documentation examples MUST stay within 72 characters.
- Commits MUST follow Conventional Commits (`feat(pdf): …`, `fix(web): …`), short and
  single-line. An AI assistant MUST NOT be added as co-author.
- The package follows semantic versioning; the public CLI flags and config schema are the
  compatibility surface.
- The package is MIT licensed. Bundled fonts MUST keep their SIL OFL 1.1 licence file, and
  bundled icons MUST keep their Lucide ISC notice.

## Development Workflow & Quality Gates

- Features move through the Spec Kit flow: specify → clarify → plan → tasks → analyze →
  implement.
- Per Principle VI, tests for a requirement MUST exist and fail before its implementation
  is written.
- A change MUST pass tests, ESLint and Prettier before it is merged.
- The v1.0 release gate is the equivalence gate: running both toolchains on `book-01` from
  `development-book` MUST match on page count and page size, chapter opening pages,
  `QA-REPORT.md` counts, EPUB chapter text, epubcheck result, and web edition HTML structure
  and reader behaviour.

## Governance

- This constitution supersedes other project practices. Where they conflict, the
  constitution wins.
- Amendments are made by changing `.specify/memory/constitution.md` in a reviewed change
  that includes a Sync Impact Report and a version bump.
- Constitution versioning (separate from the package's own version):
  - MAJOR: backward-incompatible removal or redefinition of a principle or governance rule.
  - MINOR: a new principle or section, or materially expanded guidance.
  - PATCH: clarifications, wording and typo fixes with no semantic change.
- Compliance review: every `/speckit-plan` MUST pass a constitution check, and every code
  review MUST verify compliance. Any added complexity MUST be justified against
  Principle VIII.

**Version**: 1.1.0 | **Ratified**: 2026-09-28 | **Last Amended**: 2026-09-28
