# Feature Specification: Web Edition

**Feature Branch**: `002-web-edition` (no git branch created)

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Web edition: `book-build web --config <path> [--out <dir>]` builds a
static web edition of the allow-listed chapters that reads like a physical 3D book with page-turn
animations, and `book-build serve` previews it locally. Scope = delivery slices 4 and 5: US-9 (web
build), US-10 (reader behaviour) and the web part of US-11. Behaviour must match the Python
toolchain's web.py and web-reader.js at d235dbd; the reader script and web CSS are carried over.
Uses the core pipeline from feature 001."

Exact values from the Python toolchain are cited as **[REF §n]** (`reference/docs/`, git-ignored);
the values this feature needs are copied into `data-model.md` → Reference constants during planning.

## Clarifications

### Session 2026-09-29

- Q: Should the web edition include a default favicon when `favicon` is not set? → A: Yes:
  generate an open-book icon (Lucide `book-open`) on a rounded square in the cover's edge colour.
  The reference writes no icon; this is a deliberate difference (decision log).

### Session 2026-09-29 (text size)

- Q: Should readers be able to change the text size, like Apple Books? → A: Yes, for body text and
  titles; code blocks and terminals keep their size. An addition to the reference (decision log).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publish selected chapters as a web book (Priority: P1)

An author lists the chapters that are ready in the config and builds a static web edition, so that
readers can read those chapters in a browser while drafts stay private.

**Why this priority**: Without the build there is nothing to read; the allow-list protects drafts
(Constitution V).

**Independent Test**: Build the fixture books and inspect the output tree, the page markup and the
error paths, without opening a browser.

**Acceptance Scenarios**:

1. **Given** a config whose `web_published_chapters` lists existing chapter files, **When** the
   author runs `book-build web --config book.json`, **Then** `<out>/web/` contains `index.html`,
   `chapters/chNN.html` for each listed chapter, `404.html`, `style.<hash12>.css`,
   `reader.<hash12>.js`, `fonts/` with the font set's files and licence, `cover.<ext>`,
   `back-cover.<ext>`, `og-image.png` and, when configured, the favicons.
2. **Given** a chapter file that is not listed, **When** the web edition is built, **Then** that
   file is never read and none of its text appears in any output file.
3. **Given** `web_published_chapters` is missing, empty, not a list of strings, contains a path,
   a non-`.md` name, a duplicate, a missing file, or two files with the same chapter number,
   **When** the build runs, **Then** it stops with one line naming the key or the entry.
4. **Given** a previous build, **When** the web edition is rebuilt, **Then** the `web/` directory is
   emptied first and rebuilt (Constitution VII).
5. **Given** identical input, **When** the web edition is built twice, **Then** the hashed asset
   names are identical.
6. **Given** a published chapter number 7 that is the only published chapter, **When** the web
   edition is built, **Then** its page is `chapters/ch07.html` (web slugs use the chapter number,
   **[REF §2]**).

---

### User Story 2 - Read it like a book (Priority: P1)

A reader opens the web edition on a phone, tablet, foldable or desktop and reads a realistic book:
it starts closed, opens with an animation, and pages turn with a curled, hinged sheet.

**Why this priority**: This is the reading experience the web edition exists for.

**Independent Test**: Open a built fixture book in a real browser at the device sizes of
**[REF §10]** and drive it with keys, buttons and touch gestures.

**Acceptance Scenarios**:

1. **Given** a viewport at least 60 rem wide with an aspect ratio of at least 6:5 (or a foldable
   spanning two horizontal segments), **When** the book opens, **Then** it shows a two-page
   spread with the spine centred (on the fold for a spanning foldable); otherwise it shows one
   page (170:240 proportion on tablets and unfolded foldables, full screen on phones).
2. **Given** `index.html`, **When** it loads for the first time, **Then** the book is closed and
   centred on the front cover; opening and closing animate for 820 ms with the spine staying in
   place; reaching the end closes the book on the back cover.
3. **Given** an open book, **When** the reader presses ← or →, uses the Previous/Next controls or
   swipes, **Then** the page turns with a curled page; a drag follows the finger and completes
   after 25% of the page's travel or a flick, otherwise springs back; one back swipe turns a page
   on a phone; under `prefers-reduced-motion` turns are instant.
4. **Given** any page, **When** it is shown, **Then** fore-edge page stacks reflect the reading
   position and sink below the top edge; only chapter pages carry folios, in the book's digits;
   other pages are named (Cover, Contents, Back cover by default); a live region announces the
   position.
5. **Given** the reader moves into another chapter, **When** the page settles, **Then** the address
   and the document title (`Book | Chapter title`) follow the chapter without adding history
   entries.
6. **Given** the Contents panel, **When** the reader picks a chapter or a bookmark, **Then** the
   book turns to it; the bookmark toggle stores the current page.
7. **Given** the Search panel, **When** the reader types a word or phrase, **Then** up to 30
   results are listed with 30 characters of context, and choosing one turns to its page.
8. **Given** the Fullscreen API exists, **When** the reader uses the control or `F`, **Then** the
   book goes fullscreen, `Esc` leaves, and controls auto-hide after 2.5 s without activity.
9. **Given** a returning reader, **When** `index.html` opens, **Then** the last-read page is
   restored; `chapters/chNN.html` always opens at that chapter.
10. **Given** a stylesheet or fonts that load late (slow network, Safari), **When** the reader
    starts, **Then** pagination still comes out right and is re-measured after fonts load and on
    resize or orientation change, including on iOS Safari.
11. **Given** assistive technology or browser tools, **When** the reader uses them, **Then** text is
    selectable and found by browser Find, every control has a label, decorative layers are hidden
    from screen readers, and touch targets are at least 44 px (Constitution IX).
12. **Given** `localStorage` is missing or blocked, **When** the reader reads and bookmarks,
    **Then** reading never breaks (bookmarks and position simply do not persist).
13. **Given** a large screen, **When** pages with scrollable code or tables turn, **Then** there is
    no flicker.

---

### User Story 3 - Share and find the book (Priority: P2)

An author gets pages that look right when shared and when found by search engines.

**Why this priority**: Needed for parity and for promoting the book; the book reads without it.

**Independent Test**: Build a fixture book and inspect each page's head, the share image and the
favicons.

**Acceptance Scenarios**:

1. **Given** any page, **When** it is built, **Then** its title is the book title (index) or
   `Book | Chapter title` (chapter); its description is the chapter's first paragraph as plain
   text, at most 155 characters, cut at a space and ending with `…`, falling back to the book
   description, subtitle or title; it carries Open Graph (type `book` on index, `article` on
   chapters; site name, title, description, URL, image with width, height and alt) and a Twitter
   `summary_large_image` card.
2. **Given** `web_url` is set, **When** pages are built, **Then** each has a canonical URL and
   absolute `og:url`/`og:image`; **given** it is not set, the build warns and leaves out the
   canonical and `og:url`.
3. **Given** the cover, **When** the web edition is built, **Then** `og-image.png` is 1200 × 630
   with the whole cover centred on a card filled with the cover's average edge colour.
4. **Given** `back_cover` is configured, **When** built, **Then** it is copied; **given** it is
   not, a plain back cover is generated in the cover's edge colour with the title near the top
   and the author near the bottom, shaped correctly in the book's script; **given** it is
   configured but missing, the build stops naming it.
5. **Given** `favicon` is an existing `.svg`, **When** built, **Then** it is copied and 32 px and
   180 px PNGs are rendered with matching link tags; **given** it is not an existing `.svg`, the
   build stops naming it; **given** it is unset, a default favicon is generated (an open-book
   icon on a rounded square in the cover's edge colour, the icon dark or light for contrast) with
   the same files and link tags.
6. **Given** `404.html`, **When** built, **Then** it has no canonical URL, is `noindex` and loads no
   reader script.

---

### User Story 4 - Preview locally (Priority: P2)

An author previews the web edition before deploying it.

**Why this priority**: Makes the author's loop fast; deployment itself is out of scope.

**Independent Test**: Run the preview server on a fixture book and request pages over HTTP.

**Acceptance Scenarios**:

1. **Given** a config, **When** the author runs `book-build serve --config book.json`, **Then** the
   web edition is built and served at `http://127.0.0.1:<port>/` (default 8000, `--port` to change).
2. **Given** a request for a path that does not exist, **When** served, **Then** the response is
   `404.html` with status 404.
3. **Given** the server is running, **When** the author stops it (Ctrl+C), **Then** it exits cleanly.

---

### User Story 5 - Change the text size (Priority: P2)

A reader makes the text larger or smaller, like in Apple Books, so reading is comfortable on any
screen.

**Why this priority**: Comfort and accessibility; the book reads without it.

**Independent Test**: In a browser, change the size with the control and the keyboard, and check
text, titles, code and the reading position.

**Acceptance Scenarios**:

1. **Given** the book is open, **When** the reader opens the text-size control ("Aa" in the
   toolbar) and chooses larger or smaller, **Then** body text, headings, chapter titles and the
   chapter labels scale by one step, and the control shows the size (e.g. `110%`).
2. **Given** any text size, **When** pages show code blocks or terminals, **Then** those keep their
   size (inline code in sentences scales with the text).
3. **Given** the size changes, **When** the book re-paginates, **Then** the reader stays at the same
   place in the book (the same relative position) and page turning still works.
4. **Given** the smallest (85%) or largest (150%) step, **When** the control is shown, **Then** the
   button that would go further is disabled.
5. **Given** a chosen size, **When** the reader returns later, **Then** the size is restored; **given**
   `localStorage` is blocked, changing the size still works for the visit.
6. **Given** the keyboard, **When** the reader presses `+` or `-` (outside text fields), **Then** the
   size changes by one step; browser zoom shortcuts (Cmd/Ctrl) are left alone.
7. **Given** assistive technology, **When** the size changes, **Then** the new size is announced, the
   buttons have labels and are at least 44 px on touch screens.

---

### Edge Cases

- A published chapter that includes a snippet: the snippet is expanded as in feature 001.
- Parts: the contents list shows only parts that contain a published chapter.
- An English book: folios use ASCII digits and the contents heading is `Contents` (language
  defaults, feature 001 FR-007); page names come from `strings.page_names`.
- A book using a non-default font set: the web edition embeds that set's fonts and names its
  families in the stylesheet.
- A published chapter's text changes: the storage namespace changes, so readers start fresh
  instead of restoring a stale position.
- `end_image` configured: the web edition never includes it, whether or not its gate chapter
  exists (the reference web edition has no end image).
- A cover that is JPEG: `cover.jpg` is written and the share image is still PNG.
- Fonts not fetched: the build stops with the `book-build fonts` command (feature 001 FR-042).
- Port already in use for `serve`: the command stops with one line naming the port.

## Requirements *(mandatory)*

### Functional Requirements

**Build**

- **FR-001**: `book-build web --config <path> [--out <dir>]` MUST build the web edition into
  `<out>/web/`; `--out` defaults to `dist/<config file name without extension>/`.
- **FR-002**: The build MUST load only the files named in `web_published_chapters` and validate
  the list as in User Story 1 #3; chapters not listed MUST NOT be read (Constitution V).
- **FR-003**: Web chapter slugs MUST come from the chapter number (`ch07`), not the position
  **[REF §2]**; published chapter numbers MUST be unique.
- **FR-004**: The output tree MUST be exactly as in User Story 1 #1; the `web/` directory MUST be
  emptied before each build; hashed names MUST be the first 12 hex digits of the content hash
  **[REF §9]**.
- **FR-005**: Every page MUST carry the same continuous book: front cover, endpaper (two-page
  view only), contents, every published chapter starting on a new page, a filler page when needed
  so the back endpaper falls on a right-hand page, back endpaper, back cover **[REF §9]**.
- **FR-006**: `index.html` MUST open at the cover or the saved position; `chapters/chNN.html`
  MUST open at that chapter.
- **FR-007**: All links and asset references MUST be root-relative (the site is served from the
  root of its domain).
- **FR-008**: The page markup, `data-*` hooks, toolbar, panels and 404 page MUST match the
  reference structure **[REF §9]**.
- **FR-009**: Per-page metadata, share image, back cover and favicons MUST behave as in User
  Story 3.
- **FR-010**: The storage namespace MUST be `<storage_prefix>:<output dir name>:<first 10 hex
  digits of the hash of the published chapters' text>` **[REF §9]**; position and bookmarks are
  stored under it.
- **FR-011**: The build MUST use the configured font set (feature 001) for the embedded fonts and
  the stylesheet's family names, and the configured series strings for the contents heading, the
  page names and the folio digits.

**Reader**

- **FR-020**: The reader MUST behave as in User Story 2, with the timings and thresholds of
  **[REF §10]** (turn 540 ms, open 820 ms, drag start 8 px, flick 0.35 px/ms, complete at 25% of
  travel, controls hide after 2500 ms, 30 search results with 30 characters of context).
- **FR-021**: The reader script and web stylesheet MUST be carried over from the reference
  unchanged except for reading the page names, folio digits and font family names from the page
  instead of hard-coding them, and for the text-size feature (FR-024–FR-026); with the default Myanmar strings and `my-sans` fonts the output
  MUST be identical in behaviour to the reference.
- **FR-022**: The reader MUST keep every fix listed in **[REF §10]** (style-apply retry,
  estimate-based pagination, distance-based back swipes, no flicker on large screens, delayed
  opening shadow, sinking page stacks, closed book centred).
- **FR-023**: The reader MUST work without `localStorage` and without any framework, and its
  script MUST load deferred.

**Text size**

- **FR-024**: The reader MUST offer seven text-size steps (85%, 92%, 100%, 110%, 120%, 135%, 150%;
  default 100%) through a toolbar control and the `+`/`-` keys, scaling body text, headings, chapter
  titles and chapter labels, but not code blocks or terminals (User Story 5).
- **FR-025**: A size change MUST re-paginate the book and keep the relative reading position; the
  page-turn animation MUST use the same size.
- **FR-026**: The chosen size MUST persist per storage prefix and MUST NOT break reading when
  storage is unavailable.

**Preview**

- **FR-030**: `book-build serve --config <path> [--out <dir>] [--port <n>]` MUST build, then serve
  `<out>/web/` on `127.0.0.1` (default port 8000), returning `404.html` with status 404 for
  unknown paths.

**Errors and constraints**

- **FR-040**: Every error MUST stop the build with one line naming the key, entry or file
  (feature 001 FR-050); the error conditions are those in User Stories 1 and 3.
- **FR-041**: `web` and `serve` MUST NOT need network access (the fonts are already cached).
- **FR-042**: The build MUST NOT modify any source file (Constitution II).
- **FR-043**: The programmatic API MUST gain `web()` and `serve()` mirroring the new commands, and
  nothing else (Constitution VIII).

### Key Entities *(include if feature involves data)*

- **Web chapter**: a published chapter with its number-based slug, rendered HTML, short title and
  description.
- **Cover facts**: cover width/height ratio and average edge colour, used for the page shell,
  share image and generated back cover.
- **Book key**: the storage namespace for positions and bookmarks.
- **Web page**: a shell (head metadata, toolbar, reader DOM, panels) opened at the cover or at a
  chapter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For `development-book`'s `book-01`, the web file tree equals the Python toolchain's
  except for hash values, and the DOM structure of `index.html` and `chapters/ch01.html`
  (`data-*` hooks, sections, metadata tags) is identical.
- **SC-002**: The 9 cases of the Python `test_web.py` **[REF §11]** are ported and pass.
- **SC-003**: At each of the 12 device sizes of **[REF §10]**, a browser test confirms the expected
  layout (one page or spread), the spine centred (or on the fold), controls inside the viewport,
  no horizontal scroll and touch targets of at least 44 px.
- **SC-004**: Browser tests confirm: open/close, turning by key, button and swipe (including the
  one-swipe back turn on a phone), bookmarks and position with `localStorage` blocked, search,
  address/title updates, and correct pagination when the stylesheet and fonts are delayed.
- **SC-005**: No text from an unlisted chapter appears in any output file (checked by searching
  the whole output tree for a marker string placed in an unlisted fixture chapter).
- **SC-006**: Building the web edition of a 20-chapter book takes under 30 seconds on the
  project's Linux CI runner.
- **SC-008**: Browser tests confirm each text-size step scales paragraph and title sizes by the
  step factor (±1%), leaves code and terminal sizes unchanged, keeps the reader in the same chapter,
  and restores the size after a reload.
- **SC-007**: A reader can open the book and reach chapter 1's first page in at most 2 actions
  (open + one turn, or one Contents choice).

## Assumptions

- **Scope**: delivery slices 4 and 5. Deployment (static hosting upload) is out of scope; the
  command only produces the static site. PDF, EPUB and QA outputs are separate features.
- **Reference parity**: `web-reader.js` and the web CSS are copied from `development-book`
  `d235dbd`; the only changes are the parameters in FR-021, each recorded in the decision log.
- **End image**: the reference web edition has no end image, so US-11's web part means the web
  edition never shows it; the PDF/EPUB end image comes with those features.
- **English books**: folios use ASCII digits and page names from `strings.page_names`; this goes
  beyond the reference (which is Myanmar-only) and is recorded in the decision log.
- **Fonts**: the web build copies the cached font set (feature 001); it never downloads.
- **Images**: generating the back cover must shape Myanmar text correctly, so it is rendered by a
  real text-layout engine rather than drawn glyph by glyph; the tool choice is made in
  `/speckit-plan` (reference plan-input suggests a headless browser).
- **Browser tests**: the device matrix runs in CI with a headless browser; downloading that
  browser is an allowed network step (Constitution VI).
- **Performance**: SC-006 allows for image generation; the reference build is not timed.
