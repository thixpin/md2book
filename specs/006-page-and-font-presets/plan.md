# Implementation Plan: Page Size, Font Size and Font Family Presets, and a Guided init

**Branch**: `006-page-and-font-presets` (no git branch created) | **Date**: 2026-09-30 |
**Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-page-and-font-presets/spec.md`

## Summary

Add three fixed preset families to the book config — `page.size` (five trim sizes),
`font.size` (five scale factors) and `font.family` (Noto Sans Myanmar plus the candidates that
pass licence and rendering checks) — and a guided `md2book init` that offers defaults or a
short wizard. Presets are applied as per-book CSS after the carried stylesheets (which stay
byte-for-byte), so `default` + `m` + `noto-sans-myanmar` produce exactly today's PDF. New font
families are built by the maintainer font script and published in a new font release; of the
five requested families, Padauk and Masterpiece Uni Round are candidates, Myanmar Census and
NamKhone Unicode are excluded for unclear licences (research R-06).

## Technical Context

**Language/Version**: TypeScript (strict, ESM) on Node.js 26+; Python 3 + fontTools for the
maintainer font script only.

**Primary Dependencies**: existing only — Playwright/Chromium + Paged.js (PDF), pdf-lib, zod,
commander, `node:readline` (prompts). No new runtime dependency.

**Storage**: files — `book.json`, the font cache, `dist/`.

**Testing**: Vitest (unit, integration, e2e), fixture books and OFL font subsets; no network.

**Target Platform**: macOS and Linux (CI on ubuntu-latest).

**Project Type**: CLI + programmatic API (npm package `@thixpin/md2book`).

**Performance Goals**: a preset build takes no longer than today's default build (±10%); the
25-combination matrix test stays within the integration-test timeout.

**Constraints**: default output unchanged (Principle I, SC-001); carried CSS untouched;
fonts only when redistributable (spec clarification); offline after `md2book fonts`.

**Scale/Scope**: 5 page sizes × 5 font sizes × up to 3 Myanmar families (+ the 3 existing Noto
sets); ~10 source files touched, 1 new module for presets, 1 for the prompt.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | How |
| --- | --- | --- |
| I. Behavioural equivalence | Pass | `default`/`m`/Noto emit no extra CSS and keep the file name, MediaBox and fit constants (R-01, R-02); the PDF equivalence check is part of quickstart. New behaviour is recorded in the decision log. |
| II. Manuscript read-only | Pass | Presets act only on generated CSS/PDF (FR-022). |
| III. Complex scripts first-class | Pass | New families must pass shaping, syllable breaking, extraction and QA Burmese checks before listing (R-08). |
| IV. Fail loudly | Pass | Unknown preset/family, language mismatch, `font_set` conflict, bad chapter folder stop with one line. |
| V. Drafts never leak | Pass | Untouched. |
| VI. Test-first | Pass | Each FR gets a failing test first (tasks). Fixtures: OFL subsets of Padauk and Masterpiece Uni Round; no network in tests. |
| VII. Deterministic output | Pass | Preset CSS and factors are pure functions of the config; font files are checksum-pinned. |
| VIII. Small surface | Pass | Fixed lists, no custom sizes, no new runtime dependency; the prompt is a small internal module, not a framework. |
| IX. Accessible web output | Pass | Web edition only changes font family. |
| Licences (Engineering Standards) | Pass | Only OFL fonts with their licence files; Padauk shipped unmodified because of its Reserved Font Name (R-06, R-07). |

Post-design re-check: pass (no new violations; Complexity Tracking empty).

## Project Structure

### Documentation (this feature)

```text
specs/006-page-and-font-presets/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/cli.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── config/
│   ├── presets.ts        # NEW: page and font size presets, family table, resolution
│   ├── schema.ts         # page, font objects
│   ├── load.ts           # resolve page/font; font_set compatibility and errors
│   └── language.ts       # FontSetId widened; typeface_line from the family
├── fonts/
│   ├── manifest.ts       # optional body roles, new set ids
│   └── command.ts        # resolve set from font.family
├── pdf/
│   ├── stylesheets.ts    # page-size and font-size overrides in book.css
│   ├── document.ts       # fitPreBlocks takes text width and factor
│   ├── normalise.ts      # MediaBox from the preset
│   ├── build.ts          # pdfName suffix from the preset
│   └── command.ts        # pass presets through
├── web/assets.ts         # substituteFonts drops omitted roles
├── web/back-cover.ts     # body-bold fallback
├── qa/pdf-checks.ts      # target size from the preset
├── cover/command.ts      # family-based set
├── init/
│   ├── select.ts         # NEW: arrow-key single-choice prompt
│   ├── prompts.ts        # mode question, wizard steps
│   ├── options.ts        # validate new flags
│   ├── templates.ts      # write page/font/chapter_glob
│   └── init.ts           # chapter folder
├── cli.ts                # new init flags
└── index.ts              # InitOptions mirrors flags (FR-023)

scripts/build-fonts.py, scripts/make-font-fixtures.py   # new sets and fixture subsets
assets/fonts-manifest.json                               # fonts-v2, new sets
test/fixtures/book-fonts/, test/fixtures/fonts-*/        # Burmese verification fixture, subsets
test/unit/…, test/integration/pdf-presets.test.ts, test/integration/init.test.ts
docs/configuration.md, docs/commands.md, docs/fonts.md, docs/getting-started.md
specs/001-core-manuscript-pipeline/contracts/book-config.schema.json, specs/decision-log.md
```

**Structure Decision**: Single project, existing layout. One new module for the preset tables
(`src/config/presets.ts`) so page size, font size and families are defined once and shared by
config validation, the PDF build, init and the docs tests.

## Delivery order

1. Page size presets (US1) — independent, P1.
2. Font size presets (US2) — independent, P1.
3. Guided init (US4) for page and font size — usable before new families exist.
4. Font families (US3): manifest and code support for optional roles and new sets, fixtures,
   then the maintainer build and `fonts-v2` release (needs approval to upload), then the
   rendering and visual verification that decides which families are listed.
5. Docs, decision log, full check suite, sample PDFs for visual review.

## Complexity Tracking

None.
