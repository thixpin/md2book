(() => {
  // Storage can be unavailable (private mode, blocked site data); reading
  // must keep working without it.
  const storage = {
    read(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Nothing to do: the position simply is not remembered.
      }
    },
  };
  const reader = document.querySelector("[data-reader]");
  if (!reader) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const book = reader.querySelector("[data-book]");
  const paper = reader.querySelector("[data-book-paper]");
  const windowEl = reader.querySelector(".reader-window");
  const flow = reader.querySelector(".reader-flow");
  const previous = reader.querySelector("[data-page-previous]");
  const next = reader.querySelector("[data-page-next]");
  const status = reader.querySelector("[data-page-status]");
  const indicator = reader.querySelector("[data-page-indicator]");
  const turnLayer = reader.querySelector("[data-turn-layer]");
  const turnUnder = reader.querySelector("[data-turn-under]");
  const turnCast = reader.querySelector("[data-turn-cast]");
  const turnSheet = reader.querySelector("[data-turn-sheet]");
  const numbers = {
    left: reader.querySelector('[data-page-number="left"]'),
    right: reader.querySelector('[data-page-number="right"]'),
  };
  // md2book: running heads (spec 004 FR-023), placed like the folios.
  const heads = {
    left: reader.querySelector('[data-page-head="left"]'),
    right: reader.querySelector('[data-page-head="right"]'),
  };
  const bookAuthor = reader.dataset.author || "";
  // The toolbar lives in the page header, outside the reader.
  const bookmarkToggle = document.querySelector("[data-bookmark-toggle]");
  const fullscreenToggle = document.querySelector("[data-fullscreen-toggle]");
  const header = document.querySelector(".site-header");
  const controls = reader.querySelector(".reader-controls");
  const bookmarkList = reader.querySelector("[data-bookmark-list]");
  const bookmarkEmpty = reader.querySelector("[data-bookmark-empty]");
  const contentsPanel = reader.querySelector("#reader-contents");
  const searchPanel = reader.querySelector("#reader-search");
  const searchInput = reader.querySelector("[data-search-input]");
  const searchStatus = reader.querySelector("[data-search-status]");
  const searchResults = reader.querySelector("[data-search-results]");
  const contentsLinks = [...contentsPanel.querySelectorAll("a[data-chapter]")];
  const chapterSections = [...flow.querySelectorAll(".book-chapter")];
  const bookTitle = reader.dataset.bookTitle;
  const openChapter = reader.dataset.openChapter;
  const coverEl = reader.querySelector("[data-book-cover]");
  const coverSrc = reader.dataset.coverSrc;
  const coverRatio = parseFloat(reader.dataset.coverRatio) || 0.708;
  const coverEdge = reader.dataset.coverEdge;
  const backCoverEl = reader.querySelector("[data-book-back-cover]");
  const backCoverSrc = reader.dataset.backCoverSrc;
  // md2book: the home page's path, "/" unless the site is served under a path (project Pages).
  const homePath = reader.dataset.siteRoot || "/";
  const backMatter = [...flow.querySelectorAll(".back-matter")];
  const backEndpaper = flow.querySelector(".back-endpaper");
  const backCoverSection = flow.querySelector(".back-cover-page");
  const positionKey = `${reader.dataset.bookKey}:position`;
  const bookmarksKey = `${reader.dataset.bookKey}:bookmarks`;
  // Text size (md2book addition, spec 002 FR-024): seven steps scale the text and titles, not
  // code; the choice is kept per storage prefix and the book re-paginates at the same place.
  const TEXT_SCALES = [0.85, 0.92, 1, 1.1, 1.2, 1.35, 1.5];
  const textScaleKey = `${reader.dataset.bookKey.split(":")[0]}:text-scale`;
  const textSmaller = reader.querySelector("[data-text-smaller]");
  const textLarger = reader.querySelector("[data-text-larger]");
  const textSizeOutput = reader.querySelector("[data-text-size]");
  // md2book: the text size panel and its spinner (stepTextScale).
  const textPanel = document.getElementById("reader-text");
  const textBusy = document.querySelector("[data-text-busy]");
  let resizing = false;
  let textScale = TEXT_SCALES.includes(storage.read(textScaleKey, 1)) ? storage.read(textScaleKey, 1) : 1;
  applyTextScale(textScale);
  // Two pages on wide, landscape screens and on foldables spanning their
  // fold; the same query as the spread styles in web.py.
  const desktop = window.matchMedia(
    "(min-width: 60rem) and (min-aspect-ratio: 6/5), (horizontal-viewport-segments: 2)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  const STRIPS = 12;
  const MAX_SHEETS = 16;
  // md2book: 400 ms (reference 540), closer to reader apps; the curl still reads as a turn.
  const TURN_MS = 400;
  const MAX_FRAME_STEP = 34;
  const MIN_SETTLE_MS = 140;
  const DRAG_START_PX = 8;
  const FLICK_SPEED = 0.35;
  const COMPLETE_TRAVEL = 0.25;
  const OPEN_MS = 820;
  const HIDE_CONTROLS_MS = 2500;
  const MAX_SEARCH_RESULTS = 30;
  const SEARCH_CONTEXT = 30;
  // The page edges dip slightly toward the spine where the paper bends into
  // the binding: DIP px deep, flattening out DIP_REACH px from the spine.
  const DIP = 3.5;
  const DIP_REACH = 46;
  const DIP_SAMPLES = [0, 4, 9, 15, 23, 33, DIP_REACH];

  let pageCount = 1;
  let turn = 0;
  let pagesPerView = 1;
  let pageWidth = 0;
  let pageGap = 0;
  let resizeTimer;
  let animating = false;
  // md2book: the page turn being animated, if any: { jump() } (runTurn).
  let running = null;
  // md2book: true while measure() shows the (re)laid-out book (syncAddress sends no page view).
  let laying = false;
  let paperKey = "";
  let surfaces = null;
  let buildTimer;
  let firstLayout = true;
  // Where each chapter starts, found after each layout: { slug, title,
  // shortTitle, href, page }. Pages before the first chapter are the cover
  // and the contents; they carry no folio.
  let chapterStarts = [];
  // md2book: each top-level section of the flow and its pages: { el, start, pages }.
  let sections = [];
  let prepareTimer = 0;
  let frontPages = 0;
  // In two-page spreads the closed book shows the cover alone on the right,
  // so page 0 is an empty left side that no text flows into: text page k
  // (the flow's column k) is page k + pageShift. The cover is the first
  // real page.
  let pageShift = 0;
  const coverPage = () => pageShift;
  // Like a printed book, only the chapters' pages are numbered, from 1 on the
  // first chapter page; the covers, endpapers, blank pages and contents are
  // not.
  const pageLabel = (page) => page - frontPages + 1;
  const isNumbered = (page) => page >= frontPages && page < bodyEnd;
  let contentsPage = -1;
  // The back cover is the last page; body pages (with folios) end before
  // the back matter.
  let backCoverPage = Infinity;
  let bodyEnd = Infinity;

  const numberOfPagesPerView = () => (desktop.matches ? 2 : 1);
  const dipAt = (distance) =>
    distance >= DIP_REACH ? 0 : DIP * (1 - distance / DIP_REACH) ** 2;
  const easeInOut = (t) => 0.5 - Math.cos(Math.PI * t) / 2;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  // Folios are printed with Myanmar digits (U+1040–U+1049), like the book,
  // unless the page asks for ASCII digits (data-folio-digits="ascii").
  const asciiFolios = reader.dataset.folioDigits === "ascii";
  // md2book: the running heads and feet (data-running; absent means this default layout).
  const defaultLayout = {
    top: { inner: "chapter-title", center: "none", outer: "author" },
    bottom: { inner: "book-title", center: "none", outer: "page-number" },
  };
  const layout = reader.dataset.running ? JSON.parse(reader.dataset.running) : defaultLayout;
  const burmeseDigits = (number) =>
    asciiFolios
      ? `${number}`
      : `${number}`.replace(/\d/g, (digit) => String.fromCharCode(0x1040 + +digit));

  // Window-relative geometry: the spine is the centre of a spread, or the
  // left edge when a single page is shown.
  function geometry() {
    const width = windowEl.clientWidth;
    const height = windowEl.clientHeight;
    const spine = pagesPerView === 2 ? width / 2 : 0;
    return { width, height, spine, page: width - spine };
  }

  function stackRatios(turnIndex) {
    const firstVisible = turnIndex * pagesPerView;
    const span = Math.max(pageCount - pagesPerView, 1);
    const read = Math.min(firstVisible / span, 1);
    return { left: read, right: 1 - read };
  }

  // A full sheet attached at the spine. Its free edges fan out: `spread` px
  // past the outer edge and a little downward, growing from zero at the
  // spine so neighbouring sheets almost overlap there.
  function sheetPath(g, side, spread) {
    // Sheets under the top page sit slightly lower than it, so its top edge
    // covers theirs; their edges show along the outer fore-edge and, just
    // a little, below the bottom edge, and all of it narrows to nothing at
    // the spine.
    const outerSpread = spread;
    const sink = spread * 0.25;
    const drop = spread * 0.35;
    const top = [];
    const bottom = [];
    for (let k = 0; k <= 24; k++) {
      const u = k / 24;
      const distance = u * g.page;
      const x = g.spine + side * (distance + outerSpread * u ** 1.5);
      const fan = u ** 1.7;
      top.push(`${x.toFixed(2)} ${(dipAt(distance) + sink * fan).toFixed(2)}`);
      bottom.push(`${x.toFixed(2)} ${(g.height - dipAt(distance) + drop * fan).toFixed(2)}`);
    }
    const outerX = g.spine + side * (g.page + outerSpread);
    const bulge = (outerX + side * outerSpread * 0.2).toFixed(2);
    return `M ${top.join(" L ")} Q ${bulge} ${(g.height / 2).toFixed(2)} ` +
      `${bottom[24]} L ${bottom.reverse().join(" L ")} Z`;
  }

  function svg(name, attributes) {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }

  // Each sheet sits a fixed step further out than the one above it, so a
  // thinner or thicker stack gains or loses whole sheets while the others
  // stay put. Only flat paper shapes are drawn here: the book's soft shadow
  // is a static CSS box-shadow, because re-rendering a blurred SVG shadow
  // whenever the stacks change is expensive enough on 2x screens for Chrome
  // to show the paper half-drawn.
  // `empty` is the side of a two-page spread with no page ("left" while the
  // book is closed at the front, "right" at the back), which is not drawn.
  function drawPaper(ratios, empty = null) {
    const g = geometry();
    const step = (pagesPerView === 2 ? 15 : 7) / MAX_SHEETS;
    const sides = (pagesPerView === 2 ? [[-1, ratios.left], [1, ratios.right]] : [[1, ratios.right]])
      .filter(([side]) => side !== (empty === "left" ? -1 : empty === "right" ? 1 : 0))
      .map(([side, ratio]) => [side, ratio > 0 ? Math.max(1, Math.round(ratio * MAX_SHEETS)) : 0]);
    const size = `${g.width}x${g.height}`;
    const key = `${size}:${empty}:${sides.join(";")}`;
    if (key === paperKey) return;
    paperKey = key;
    paper.setAttribute("width", g.width);
    paper.setAttribute("height", g.height);
    paper.setAttribute("viewBox", `0 0 ${g.width} ${g.height}`);
    const sheets = svg("g", {});
    const tops = svg("g", {});
    sides.forEach(([side, count]) => {
      for (let k = count; k >= 1; k--) {
        const jitter = ((k * 37) % 7 - 3) * 0.06;
        const light = 94.5 - k * 0.32 - (k % 3) * 0.35;
        sheets.append(svg("path", { class: "sheet", d: sheetPath(g, side, Math.max(0, k * step + jitter)),
          fill: `hsl(42 24% ${light.toFixed(2)}%)` }));
      }
      tops.append(svg("path", { class: "top-page", d: sheetPath(g, side, 0) }));
    });
    paper.replaceChildren(sheets, tops);
  }

  // Polygon clip giving an element the dipped page edge near the spine.
  // `offset` is the element's distance from the spine at its spine-side edge.
  function spineClip(width, offset, spineOnRight) {
    if (offset >= DIP_REACH) return "none";
    const xs = [0, ...DIP_SAMPLES.filter((d) => d > offset && d < offset + width)
      .map((d) => d - offset), width];
    const at = (x) => (spineOnRight ? width - x : x);
    const top = xs.map((x) => `${at(x).toFixed(2)}px ${dipAt(offset + x).toFixed(2)}px`);
    const bottom = xs.map((x) =>
      `${at(x).toFixed(2)}px calc(100% - ${dipAt(offset + x).toFixed(2)}px)`).reverse();
    return `polygon(${[...top, ...bottom].join(", ")})`;
  }

  // Paper for a page on one side of the spine: gutter shading aligned to
  // the static page and the dipped edge near the spine.
  function paperFace(el, g, side, originX, width, clip) {
    const pageStart = side > 0 ? g.spine : g.spine - g.page;
    el.paper = {
      side,
      image: side > 0 ? "var(--shade-right)" : "var(--shade-left)",
      size: `${g.page}px 100%`,
      position: `${pageStart - originX}px 0`,
    };
    paintPaper(el, el.paper);
    el.style.clipPath = clip;
    el.style.width = `${width}px`;
  }

  function paintPaper(el, { image, size, position, color = "" }) {
    el.style.backgroundImage = image;
    el.style.backgroundSize = size;
    el.style.backgroundPosition = position;
    el.style.backgroundColor = color;
  }

  // The cover image, as large as fits the right-hand page, on the cover's
  // own edge colour so the whole page reads as cover. `originX` is the window
  // x of the element's left edge.
  function coverPaint(g, originX, side = 1, src = coverSrc) {
    const width = Math.min(g.page, g.height * coverRatio);
    const height = width / coverRatio;
    const x = (side > 0 ? g.spine : g.spine - g.page) + (g.page - width) / 2;
    return { image: `url("${src}")`, size: `${width}px ${height}px`,
      position: `${x - originX}px ${(g.height - height) / 2}px`, color: coverEdge };
  }

  // md2book: a surface holds copies of only the sections (a chapter, the contents, the back
  // matter) of the pages it shows, instead of the whole book: 25 whole-book copies made a long
  // book's turns take seconds and its memory grow with its length. Each section starts a new
  // page, so it paginates the same alone. prepareTurns() makes the copies for the next and the
  // previous turn while the reader is idle, so a turn starts without cloning anything.
  function makeSurface(el, originX) {
    const number = document.createElement("span");
    number.className = "page-number";
    const head = document.createElement("span");
    head.className = "page-head";
    el.replaceChildren(number, head);
    return { el, copy: null, copies: new Map(), number, head, originX };
  }

  function copyFor(surface, section) {
    let copy = surface.copies.get(section);
    if (!copy) {
      copy = flow.cloneNode(false);
      copy.classList.add("turn-copy");
      copy.classList.remove("is-measuring");
      copy.append(section.el.cloneNode(true));
      copy.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      const styles = getComputedStyle(flow);
      const padding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      copy.style.columnCount = `${section.pages}`;
      copy.style.width = `${section.pages * pageWidth + (section.pages - 1) * pageGap + padding}px`;
      copy.style.visibility = "hidden";
      surface.el.prepend(copy);
      surface.copies.set(section, copy);
    }
    return copy;
  }

  function useSection(surface, section) {
    const copy = copyFor(surface, section);
    if (surface.copy && surface.copy !== copy) surface.copy.style.visibility = "hidden";
    surface.copy = copy;
  }

  // The pages a turn from the current spread to `targetTurn` shows on the sheet's front and back
  // and under it (as startTurn places them).
  function turnPages(direction, targetTurn) {
    const currentStart = turn * pagesPerView;
    const targetStart = targetTurn * pagesPerView;
    return {
      front: (direction > 0 ? currentStart : targetStart) + pagesPerView - 1,
      back: pagesPerView === 2 ? (direction > 0 ? targetStart : currentStart) : null,
      under: direction > 0 ? targetStart + pagesPerView - 1 : targetStart,
    };
  }

  function prepareTurns() {
    window.clearTimeout(prepareTimer);
    if (!surfaces || animating) return;
    const lastTurn = Math.floor((pageCount - 1) / pagesPerView);
    const wanted = new Map([...surfaces.strips.flatMap(({ front, back }) => [front, back]), surfaces.under]
      .map((surface) => [surface, new Set()]));
    for (const direction of [1, -1]) {
      const target = turn + direction;
      if (target < 0 || target > lastTurn) continue;
      const pages = turnPages(direction, target);
      const need = (surface, page) => {
        if (page === null || page < pageShift || page >= pageCount) return;
        const section = sectionAt(page);
        copyFor(surface, section);
        wanted.get(surface).add(section);
      };
      surfaces.strips.forEach(({ front, back }) => {
        need(front, pages.front);
        need(back, pages.back);
      });
      need(surfaces.under, pages.under);
    }
    for (const [surface, sections] of wanted) {
      for (const [section, copy] of surface.copies) {
        if (sections.has(section) || copy === surface.copy) continue;
        copy.remove();
        surface.copies.delete(section);
      }
    }
  }

  function schedulePrepare() {
    window.clearTimeout(prepareTimer);
    prepareTimer = window.setTimeout(prepareTurns, 120);
  }

  const sectionAt = (page) => sections.findLast((section) => section.start <= page) ?? sections[0];

  // Points a prepared surface at a page. Nothing is created or laid out:
  // only a transform, the folio and visibility change.
  function showPage(surface, pageIndex) {
    const exists = pageIndex !== null && pageIndex >= pageShift && pageIndex < pageCount;
    const back = exists && pageIndex === backCoverPage;
    const cover = back || (exists && pageIndex === coverPage());
    const section = sectionAt(exists ? pageIndex : pageShift);
    useSection(surface, section);
    surface.copy.style.visibility = exists && !cover ? "" : "hidden";
    surface.number.style.visibility = exists && pageIndex >= frontPages && pageIndex < bodyEnd ? "" : "hidden";
    surface.head.style.visibility = exists && hasHead(pageIndex) ? "" : "hidden";
    paintPaper(surface.el, cover
      ? coverPaint(surfaces.g, surface.originX, surface.el.paper.side, back ? backCoverSrc : coverSrc)
      : surface.el.paper);
    if (!exists) return;
    const firstVisible = pagesPerView === 2 ? pageIndex - (pageIndex % 2) : pageIndex;
    surface.copy.style.transform =
      `translateX(${-(firstVisible - section.start) * (pageWidth + pageGap) - surface.originX}px)`;
    placeFolio(surface.number, pageIndex, surface.originX);
    placeHead(surface.head, pageIndex, surface.originX);
  }

  // md2book (spec 004 FR-023): the foot of each page is the page number at the outer corner and
  // the book title at the inner one; its head is the author outside and the chapter title inside.
  // Both span the text block, in the padding where no text flows. `originX` is the window x of
  // the left edge of the element they are drawn in.
  function placeFolio(el, pageIndex, originX) {
    placeLine(el, pageIndex, originX, layout.bottom, false);
  }

  function placeHead(el, pageIndex, originX) {
    placeLine(el, pageIndex, originX, layout.top, true);
  }

  // md2book: what each running slot shows (the book's `running` layout, passed as data-running
  // when it is not the default below).
  const runningText = {
    author: () => bookAuthor,
    "book-title": () => bookTitle,
    "chapter-title": (page) => chapterAt(page)?.shortTitle ?? "",
    "page-number": (page) => burmeseDigits(pageLabel(page)),
    none: () => "",
  };

  // Numbered pages carry a head, except a chapter's first page, whose own head shows the titles.
  const hasHead = (page) =>
    page >= frontPages && page < bodyEnd && !chapterStarts.some((start) => start.page === page);

  function placeLine(el, pageIndex, originX, slots, top) {
    const styles = getComputedStyle(flow);
    const onLeft = pagesPerView === 2 && pageIndex % 2 === 0;
    const left = onLeft
      ? parseFloat(styles.paddingLeft)
      : windowEl.clientWidth - parseFloat(styles.paddingRight) - pageWidth;
    const y = top
      ? parseFloat(styles.paddingTop) * 0.36
      : windowEl.clientHeight - parseFloat(styles.paddingBottom) * 0.36;
    const part = (className, value) => {
      const span = document.createElement("span");
      span.className = className;
      span.textContent = runningText[value](pageIndex);
      return span;
    };
    const outer = part("outside", slots.outer);
    const inner = part("inside", slots.inner);
    // The center part only when used, so the default line is unchanged.
    const center = slots.center === "none" ? [] : [part("center", slots.center)];
    el.replaceChildren(...(onLeft ? [outer, ...center, inner] : [inner, ...center, outer]));
    el.style.width = `${pageWidth}px`;
    el.style.transform = `translate(${left - originX}px, ${y}px) translateY(${top ? 0 : -100}%)`;
  }

  // The turning sheet (hinged strips) and the page under it keep their own
  // copies of the text. They are built once per layout while the reader is
  // idle, so starting a turn never clones or lays out the book.
  function buildSurfaces() {
    window.clearTimeout(buildTimer);
    const g = geometry();
    const w = g.page / STRIPS;
    const strips = [];
    let parent = turnSheet;
    turnSheet.replaceChildren();
    for (let i = 0; i < STRIPS; i++) {
      const strip = document.createElement("div");
      strip.className = "turn-strip";
      strip.style.width = `${w}px`;
      strip.style.left = `${i === 0 ? g.spine : w}px`;
      const [front, back] = ["front", "back"].map((name) => {
        const face = document.createElement("div");
        face.className = `turn-face ${name}`;
        const isFront = name === "front";
        // Once turned, the back of strip i lies i+1 strips left of the spine.
        const originX = isFront ? g.spine + i * w : g.spine - (i + 1) * w - 1;
        paperFace(face, g, isFront ? 1 : -1, originX, w + 1, spineClip(w + 1, i * w, !isFront));
        const surface = makeSurface(face, originX);
        surface.shade = document.createElement("div");
        surface.shade.className = "turn-shade";
        face.append(surface.shade);
        strip.append(face);
        return surface;
      });
      parent.append(strip);
      parent = strip;
      strips.push({ strip, front, back });
    }
    const band = document.createElement("span");
    band.className = "turn-cast-band";
    turnCast.replaceChildren(band);
    surfaces = { g, w, strips, band, under: makeSurface(turnUnder, 0) };
    schedulePrepare();
  }

  function scheduleBuild() {
    surfaces = null;
    window.clearTimeout(buildTimer);
    buildTimer = window.setTimeout(buildSurfaces, 300);
  }

  // Poses the sheet with its spine edge at `root` degrees and its outer edge
  // at `tip`; the difference is spread evenly over the hinges as a curl.
  // Only transforms and opacity change, so each frame stays on the compositor.
  function poseSheet(root, tip) {
    const { g, w, strips, band } = surfaces;
    const bend = (tip - root) / (STRIPS - 1);
    let angle = root;
    let tipX = g.spine;
    let lift = 0;
    strips.forEach(({ strip, front, back }, i) => {
      if (i) angle += bend;
      strip.style.transform = `rotateY(${(i ? bend : root).toFixed(3)}deg)`;
      const tilt = 1 - Math.abs(Math.cos(radians(angle)));
      front.shade.style.opacity = back.shade.style.opacity = (tilt * 0.2).toFixed(3);
      tipX += w * Math.cos(radians(angle));
      lift = Math.max(lift, Math.abs(Math.sin(radians(angle))));
    });
    // The shadow the sheet casts just beyond its free edge, on whichever
    // page lies under it.
    const toward = tipX >= g.spine ? 1 : -1;
    band.style.transform =
      `translateX(${tipX.toFixed(2)}px) scaleX(${((toward * (14 + 60 * lift)) / 100).toFixed(3)})`;
    band.style.opacity = lift.toFixed(3);
  }

  // Pagination depends on the viewport, so a page stored with a different
  // page count is mapped to the same relative place in this layout.
  function mapPage(page, count) {
    if (!(page >= 0)) return 0;
    if (!(count > 1) || count === pageCount) return Math.min(page, pageCount - 1);
    return Math.min(pageCount - 1, Math.round((page / (count - 1)) * (pageCount - 1)));
  }

  // Page index of a layout rectangle inside the flow.
  function pageOf(rect) {
    const start = flow.getBoundingClientRect().left + parseFloat(getComputedStyle(flow).paddingLeft);
    return Math.max(0, Math.floor((rect.left - start + 1) / (pageWidth + pageGap))) + pageShift;
  }

  // md2book: a section heading never ends a page with fewer than two lines of what follows it
  // (spec 004 FR-020). WebKit ignores break-after: avoid in columns, so a heading left too low
  // starts the next page instead (Chromium already keeps them together). In document order, as
  // each move shifts the pages after it; a heading that already starts its page stays.
  function keepHeadingsWithContent(layOut) {
    for (const heading of flow.querySelectorAll(".chapter-body :is(h2, h3, h4, h5, h6)")) {
      const next = heading.nextElementSibling;
      const before = heading.previousElementSibling?.getClientRects();
      if (!next || !before?.length) continue;
      // Pages counted from the heading's own column (0 = its page): absolute page numbers drift in
      // WebKit, which rounds column widths, far into a long book.
      const origin = heading.getClientRects()[0].left;
      const pageFrom = (rect) => Math.floor((rect.left - origin + 1) / (pageWidth + pageGap));
      const lineKeys = (rects) => new Set(rects.map((rect) => `${pageFrom(rect)}:${Math.round(rect.top)}`));
      if (pageFrom(before[before.length - 1]) !== 0) continue;
      const range = document.createRange();
      range.selectNodeContents(next);
      const lines = [...range.getClientRects()].filter((rect) => rect.width > 0);
      const here = lineKeys(lines.filter((rect) => pageFrom(rect) === 0)).size;
      if (here < Math.min(2, lineKeys(lines).size)) {
        heading.classList.add("keep-with-next");
        layOut();
      }
    }
  }

  const chapterAt = (page) =>
    (page < bodyEnd && chapterStarts.findLast((start) => start.page <= page)) || null;

  // A chapter's own URL opens the book at that chapter, unless the reader was
  // already inside it; the home page resumes where the reader left off.
  function initialPage() {
    const saved = storage.read(positionKey, null);
    const savedPage = saved && saved.page >= 0 ? mapPage(saved.page, saved.pageCount) : null;
    const opened = chapterStarts.find((start) => start.slug === openChapter);
    if (opened) return savedPage !== null && chapterAt(savedPage) === opened ? savedPage : opened.page;
    return savedPage ?? 0;
  }

  function readBookmarks() {
    const list = storage.read(bookmarksKey, []);
    return Array.isArray(list) ? list.filter((mark) => mark && mark.page >= 0) : [];
  }

  function isVisible(mark) {
    const first = turn * pagesPerView;
    const page = mapPage(mark.page, mark.pageCount);
    return page >= first && page < first + pagesPerView;
  }

  function goToPage(page) {
    if (animating) return;
    const target = Math.floor(Math.min(page, pageCount - 1) / pagesPerView);
    if (target !== turn) turnTo(target > turn ? 1 : -1, target);
  }

  // The address and title follow the chapter being read, so sharing or
  // reloading returns to it; the cover and contents belong to the home page.
  function syncAddress(page) {
    const current = chapterAt(page);
    document.title = current ? `${bookTitle} | ${current.shortTitle}` : bookTitle;
    contentsLinks.forEach((link) => {
      if (link.dataset.chapter === current?.slug) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    const path = current ? current.href : homePath;
    if (window.location.pathname === path) return;
    try {
      history.replaceState(null, "", path);
    } catch {
      // Opened from a file: the address cannot change, which is harmless.
      return;
    }
    // md2book: the page shows another chapter; web analytics (if the book has it) counts a
    // page view from this event. The reader itself knows no analytics provider.
    if (!laying) {
      document.dispatchEvent(new CustomEvent("md2book:pageview", { detail: { path, title: document.title } }));
    }
  }

  function renderBookmarks() {
    const rank = (mark) => mapPage(mark.page, mark.pageCount);
    const marks = readBookmarks().sort((a, b) => rank(a) - rank(b));
    bookmarkEmpty.hidden = marks.length > 0;
    bookmarkList.replaceChildren(...marks.map((mark) => {
      const item = document.createElement("li");
      const open = document.createElement("button");
      open.type = "button";
      const page = mapPage(mark.page, mark.pageCount);
      open.textContent = `${chapterAt(page)?.title || bookTitle} · ${pageReference(page)}`;
      open.addEventListener("click", () => {
        contentsPanel.hidePopover();
        goToPage(page);
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "bookmark-remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove bookmark: ${open.textContent}`);
      remove.addEventListener("click", () => {
        storage.write(bookmarksKey, readBookmarks().filter((other) =>
          other.page !== mark.page || other.pageCount !== mark.pageCount));
        renderBookmarks();
        updateControls();
      });
      item.append(open, remove);
      return item;
    }));
  }

  function toggleBookmark() {
    if (animating) return;
    const marks = readBookmarks();
    const kept = marks.filter((mark) => !isVisible(mark));
    if (kept.length === marks.length) {
      // The spread's first numbered or named page (so the contents spread is
      // "Contents", not its blank endpaper; the closed cover's spread starts
      // with an empty side).
      const pages = [];
      for (let page = Math.max(turn * pagesPerView, pageShift); page < Math.min((turn + 1) * pagesPerView, pageCount); page++) {
        pages.push(page);
      }
      kept.push({ page: pages.find((page) => isNumbered(page) || pageName(page)) ?? pages[0], pageCount });
    }
    storage.write(bookmarksKey, kept);
    renderBookmarks();
    updateControls();
  }

  // What an unnumbered page is called, or "" for a blank page.
  function pageName(page) {
    if (page === coverPage()) return reader.dataset.nameCover || "Cover";
    if (page === contentsPage) return reader.dataset.nameContents || "Contents";
    if (page === backCoverPage) return reader.dataset.nameBackCover || "Back cover";
    return "";
  }

  // "page 7" for a numbered page, otherwise its name.
  const pageReference = (page) => (isNumbered(page) ? `page\u00a0${pageLabel(page)}` : pageName(page) || "blank page");

  function updateControls() {
    const visible = [];
    for (let page = turn * pagesPerView; page < Math.min((turn + 1) * pagesPerView, pageCount); page++) {
      visible.push(page);
    }
    const numbered = visible.filter(isNumbered);
    if (numbered.length) {
      const first = pageLabel(numbered[0]);
      const last = pageLabel(numbered[numbered.length - 1]);
      const total = bodyEnd - frontPages;
      indicator.textContent = `${first === last ? first : `${first}–${last}`} / ${total}`;
      status.textContent = first === last ? `Page ${first} of ${total}` : `Pages ${first}–${last} of ${total}`;
    } else {
      const name = visible.map(pageName).find(Boolean) || "";
      indicator.textContent = name;
      status.textContent = name || "Blank page";
    }
    previous.disabled = turn === 0;
    next.disabled = turn >= lastTurn();
    const marked = readBookmarks().some(isVisible);
    const bookmarkLabel = marked ? "Remove bookmark" : "Bookmark page";
    bookmarkToggle.setAttribute("aria-pressed", `${marked}`);
    bookmarkToggle.setAttribute("aria-label", bookmarkLabel);
    bookmarkToggle.title = bookmarkLabel;
  }

  // The book is closed at the front on the first spread (cover alone on the
  // right) and at the back on the spread showing the back cover (alone on the
  // left in two-page spreads).
  const spreadHas = (turnIndex, page) => page >= turnIndex * pagesPerView && page < (turnIndex + 1) * pagesPerView;
  const closedFront = (turnIndex) => turnIndex === 0;
  const closedBack = (turnIndex) => spreadHas(turnIndex, backCoverPage);
  const emptySide = (turnIndex) => (pagesPerView !== 2 ? null
    : closedFront(turnIndex) ? "left" : closedBack(turnIndex) ? "right" : null);

  function setClosed(front, back, showFront, showBack) {
    book.classList.toggle("is-closed", front);
    book.classList.toggle("is-closed-back", back);
    book.classList.toggle("show-cover", showFront);
    book.classList.toggle("show-back-cover", showBack);
  }

  function placeCover(el, left, width, side, src, g) {
    el.style.left = `${left}px`;
    el.style.width = `${width}px`;
    el.style.height = `${g.height}px`;
    // The front cover paints its front face; the back cover the element.
    paintPaper(el.querySelector("[data-cover-front]") || el, coverPaint(g, left, side, src));
  }

  function showTurn() {
    const firstPage = turn * pagesPerView;
    flow.style.transform = `translateX(${-(firstPage - pageShift) * (pageWidth + pageGap)}px)`;
    drawPaper(stackRatios(turn), emptySide(turn));
    const g = geometry();
    const backSide = pagesPerView === 2 ? -1 : 1;
    placeCover(coverEl, g.spine, g.page, 1, coverSrc, g);
    placeCover(backCoverEl, backSide > 0 ? g.spine : 0, g.page, backSide, backCoverSrc, g);
    setClosed(closedFront(turn), closedBack(turn), closedFront(turn), closedBack(turn));
    book.classList.toggle("is-centred", pagesPerView === 2 && turn === 0);
    coverEl.classList.remove("is-turned");
    bookState = pagesPerView === 2 && turn === 0 ? "closed" : "open";
    const slots = pagesPerView === 2 ? ["left", "right"] : ["right"];
    numbers.left.hidden = numbers.right.hidden = true;
    heads.left.hidden = heads.right.hidden = true;
    slots.forEach((slot, offset) => {
      const page = firstPage + offset;
      if (page >= pageCount || page < frontPages || page >= bodyEnd) return;
      placeFolio(numbers[slot], page, 0);
      numbers[slot].hidden = false;
      if (hasHead(page)) {
        placeHead(heads[slot], page, 0);
        heads[slot].hidden = false;
      }
    });
    storage.write(positionKey, { page: firstPage, pageCount });
    syncAddress(Math.min(firstPage + pagesPerView - 1, pageCount - 1));
    updateControls();
    schedulePrepare();
  }

  function applyTextScale(scale) {
    textScale = scale;
    reader.style.setProperty("--text-scale", String(scale));
    const index = TEXT_SCALES.indexOf(scale);
    if (textSmaller) textSmaller.disabled = index === 0;
    if (textLarger) textLarger.disabled = index === TEXT_SCALES.length - 1;
    if (textSizeOutput) textSizeOutput.textContent = `${Math.round(scale * 100)}%`;
  }

  function stepTextScale(delta) {
    const index = TEXT_SCALES.indexOf(textScale) + delta;
    if (animating || resizing || index < 0 || index >= TEXT_SCALES.length) return;
    // md2book: re-paginating a long book takes a moment; the panel shows a spinner (painted
    // before the work starts) and its buttons wait until the new layout is done.
    resizing = true;
    textPanel?.setAttribute("aria-busy", "true");
    if (textBusy) textBusy.hidden = false;
    if (textSmaller) textSmaller.disabled = true;
    if (textLarger) textLarger.disabled = true;
    requestAnimationFrame(() => window.setTimeout(() => {
      applyTextScale(TEXT_SCALES[index]);
      storage.write(textScaleKey, textScale);
      measure();
      resizing = false;
      textPanel?.setAttribute("aria-busy", "false");
      if (textBusy) textBusy.hidden = true;
    }, 0));
  }

  // md2book: Contents and Bookmarks as the two tabs of the contents panel. Built here, so the
  // page markup stays the reference's (without the script both lists show). Contents is selected
  // first; the arrow keys, Home and End move between the tabs, not the pages.
  function makeNavigationTabs() {
    const body = contentsPanel.querySelector(".reader-panel-body");
    const [contentsHeading, bookmarksHeading] = body.querySelectorAll(":scope > h2");
    const sections = [
      { name: "contents", label: contentsHeading.textContent, nodes: [contentsHeading.nextElementSibling] },
      { name: "bookmarks", label: bookmarksHeading.textContent, nodes: [bookmarkList, bookmarkEmpty] },
    ];
    const tablist = document.createElement("div");
    tablist.className = "panel-tabs";
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", "Navigation");
    const tabs = [];
    const panels = [];
    for (const { name, label, nodes } of sections) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.id = `reader-tab-${name}`;
      tab.textContent = label;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", `reader-tabpanel-${name}`);
      const panel = document.createElement("div");
      panel.id = `reader-tabpanel-${name}`;
      panel.className = "panel-tab";
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      panel.append(...nodes);
      tabs.push(tab);
      panels.push(panel);
    }
    const select = (index, focus = false) => {
      tabs.forEach((tab, i) => {
        tab.setAttribute("aria-selected", String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
      });
      if (focus) tabs[index].focus();
    };
    tabs.forEach((tab, i) => tab.addEventListener("click", () => select(i)));
    tablist.addEventListener("keydown", (event) => {
      const current = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
      const moves = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: tabs.length - 1 };
      if (!(event.key in moves)) return;
      event.preventDefault();
      event.stopPropagation();
      select((moves[event.key] + tabs.length) % tabs.length, true);
    });
    tablist.append(...tabs);
    body.replaceChildren(tablist, ...panels);
    body.classList.add("has-tabs");
    select(0);
  }

  // md2book: toolbar panels open just below their button, right-aligned with it and kept in the
  // window, instead of in the middle of the screen, so the pointer barely has to move.
  function placePanel(panel) {
    const button = document.querySelector(`[popovertarget="${panel.id}"]`);
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const top = rect.bottom + 12; // room for the pointer
    panel.style.inset = "auto";
    panel.style.margin = "0";
    panel.style.top = `${top}px`;
    // The panels are min(90vw, 24rem) wide (web.css): keep the whole panel inside the window.
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const width = Math.min(window.innerWidth * 0.9, 24 * rem);
    // The text size panel sits 14 px further right for balance; its pointer still meets the Aa button.
    const shift = panel.id === "reader-text" ? 14 : 0;
    const right = Math.min(
      Math.max(8, window.innerWidth - rect.right - shift),
      window.innerWidth - 8 - width,
    );
    panel.style.right = `${Math.max(0, right)}px`;
    // The pointer (web.css ::before) at the button's centre.
    const left = window.innerWidth - Math.max(0, right) - width;
    panel.style.setProperty("--pointer-x", `${(rect.left + rect.right) / 2 - left}px`);
    panel.firstElementChild.style.maxHeight =
      `min(70vh, 32rem, ${Math.max(160, window.innerHeight - top - 12)}px)`;
  }

  function measure() {
    if (animating) return;
    const styles = getComputedStyle(flow);
    // Safari can run this script before the stylesheet has applied, when
    // there is no column gap and no page size yet; paginating then gives NaN
    // and a book that cannot turn. Try again on the next frame instead.
    if (!(parseFloat(styles.columnGap) >= 0) || !(windowEl.clientWidth > 0) || !(windowEl.clientHeight > 0)) {
      requestAnimationFrame(measure);
      return;
    }
    const keep = firstLayout ? null : { page: turn * pagesPerView, pageCount };
    firstLayout = false;
    pagesPerView = numberOfPagesPerView();
    pageShift = pagesPerView === 2 ? 1 : 0;
    book.classList.toggle("is-single", pagesPerView === 1);
    const padding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    pageGap = parseFloat(styles.columnGap);
    // The column gap is the gap between facing pages plus both paddings.
    const pageGutter = pageGap - padding;
    pageWidth = (windowEl.clientWidth - (pagesPerView - 1) * pageGutter) / pagesPerView - padding;

    const height = windowEl.clientHeight;
    const pageHeight = height - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
    flow.classList.add("is-measuring");
    flow.style.transform = "none";
    flow.style.setProperty("--column-height", `${pageHeight}px`);
    // First as one plain column of natural height, which bounds the pages
    // the text needs; each forced page break (a chapter, the contents, the
    // back matter) can add at most one more. The text is then laid out in
    // that many page-high columns, and the column the back cover lands in
    // gives the exact count. (Laying out a single column and relying on
    // overflow columns does not work in iPhone Safari, which does not treat a
    // one-column container as multi-column.)
    const breaks = flow.querySelectorAll(".endpaper-page, .contents-page, .book-chapter, .back-matter").length;
    const layOut = () => {
      flow.style.columnCount = "auto";
      flow.style.height = "auto";
      flow.style.width = `${pageWidth + padding}px`;
      const estimate = Math.max(2, Math.ceil(flow.scrollHeight / pageHeight) + breaks + 1);
      flow.style.height = `${height}px`;
      flow.style.columnCount = `${estimate}`;
      flow.style.width = `${estimate * pageWidth + (estimate - 1) * pageGap + padding}px`;
      const rects = backCoverSection.getClientRects();
      pageCount = pageOf(rects[rects.length - 1]) + 1;
    };
    book.classList.remove("needs-filler");
    for (const heading of flow.querySelectorAll(".keep-with-next")) heading.classList.remove("keep-with-next");
    layOut();
    keepHeadingsWithContent(layOut);
    // Like a printed book, the inside of the back cover is a right-hand page
    // (odd index); a blank page before it keeps it there.
    if (pagesPerView === 2 && pageOf(backEndpaper.getClientRects()[0]) % 2 === 0) {
      book.classList.add("needs-filler");
      layOut();
    }
    backCoverPage = pageCount - 1;
    const firstBack = backMatter.find((section) => section.getClientRects().length);
    bodyEnd = firstBack ? pageOf(firstBack.getClientRects()[0]) : pageCount;
    contentsPage = pageOf(flow.querySelector(".contents-page").getClientRects()[0]);
    const columns = pageCount - pageShift;
    flow.style.columnCount = `${columns}`;
    flow.style.width = `${columns * pageWidth + (columns - 1) * pageGap + padding}px`;
    chapterStarts = chapterSections.map((section) => ({
      slug: section.dataset.chapter,
      title: section.dataset.title,
      shortTitle: section.dataset.shortTitle,
      href: section.dataset.href,
      page: pageOf(section.getClientRects()[0]),
    }));
    frontPages = chapterStarts.length ? chapterStarts[0].page : pageCount;
    // md2book: the page range of each top-level section, for the turn surfaces (makeSurface).
    sections = [...flow.children].flatMap((el) => {
      const rects = el.getClientRects();
      return rects.length ? [{ el, start: pageOf(rects[0]) }] : [];
    });
    sections.forEach((section, i) => {
      section.pages = Math.max(1, (sections[i + 1]?.start ?? pageCount) - section.start);
    });
    const page = keep ? mapPage(keep.page, keep.pageCount) : initialPage();
    turn = Math.floor(page / pagesPerView);
    // md2book: an address change from a (re)layout is not a page the reader chose: no page view.
    laying = true;
    showTurn();
    laying = false;
    requestAnimationFrame(() => flow.classList.remove("is-measuring"));
    // md2book: the book is laid out; the loading cover fades away over it (web.css).
    reader.classList.replace("is-loading", "is-ready");
    scheduleBuild();
  }

  // Prepares the sheet for a turn from the current spread to `targetTurn`
  // and returns its controller: pose(t) places the sheet at progress t
  // (0 flat where it starts, 1 landed), finish() commits the turn and
  // cancel() lays the sheet back. Nothing moves until pose() is called.
  // Next: the top sheet of the right stack lifts at the spine, curls over
  // and settles on the left stack. Previous runs the same motion backwards.
  function startTurn(direction, targetTurn) {
    if (!surfaces) buildSurfaces();
    const { g, strips, under } = surfaces;
    const two = pagesPerView === 2;
    const currentStart = turn * pagesPerView;
    const targetStart = targetTurn * pagesPerView;
    const current = stackRatios(turn);
    const target = stackRatios(targetTurn);
    const { front: frontPage, back: backPage } = turnPages(direction, targetTurn);
    strips.forEach(({ front, back }) => {
      showPage(front, frontPage);
      showPage(back, backPage);
    });
    turnUnder.style.display = "";
    // When the book closes, nothing lies under the turning cover: no page
    // left of the front cover, none right of the back cover.
    const underPage = direction > 0 ? targetStart + pagesPerView - 1 : targetStart;
    if (direction > 0 && underPage < pageCount) {
      turnUnder.style.left = `${g.spine}px`;
      under.originX = g.spine;
      paperFace(turnUnder, g, 1, g.spine, g.page, spineClip(g.page, 0, false));
      showPage(under, targetStart + pagesPerView - 1);
    } else if (direction < 0 && two && underPage >= pageShift) {
      turnUnder.style.left = "0px";
      under.originX = 0;
      paperFace(turnUnder, g, -1, 0, g.spine, spineClip(g.spine, 0, true));
      showPage(under, targetStart);
    } else {
      turnUnder.style.display = "none";
    }

    const from = direction > 0 ? 0 : -180;
    const to = direction > 0 ? -180 : 0;
    // The outer edge leads and the spine edge follows, so the sheet curls
    // mid-turn and lies flat again at both ends.
    const angles = (t) => [
      from + (to - from) * easeInOut(Math.max(0, (t - 0.2) / 0.8)),
      from + (to - from) * easeInOut(Math.min(1, t / 0.8)),
    ];
    const pose = (t) => poseSheet(...angles(t));
    // Window x of the sheet's outer edge at progress t (ignoring perspective),
    // the same geometry poseSheet draws.
    const edgeAt = (t) => {
      const [root, tip] = angles(t);
      const bend = (tip - root) / (STRIPS - 1);
      let x = g.spine;
      for (let i = 0; i < STRIPS; i++) x += surfaces.w * Math.cos(radians(root + i * bend));
      return x;
    };
    // Progress that puts the outer edge at window x `x`; the edge moves
    // monotonically across a turn, so bisection finds it.
    const progressFor = (x) => {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 18; i++) {
        const mid = (lo + hi) / 2;
        if ((edgeAt(mid) - x) * direction > 0) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    };
    pose(0);
    // The stack the sheet leaves thins as it lifts off; the other stack
    // thickens when showTurn runs as it lands. Redrawing the stacks
    // mid-turn would repaint the page and make Chrome rebuild and
    // re-rasterize every layer of the sheet, which shows as flashing.
    const leaving = direction > 0 ? "right" : "left";
    // Opening keeps the left side empty until the cover lands on it; closing
    // empties it as the cover lifts. Either way the sheet covers the change.
    drawPaper({ ...current, [leaving]: target[leaving] }, emptySide(turn) || emptySide(targetTurn));
    setClosed(closedFront(turn) || closedFront(targetTurn), closedBack(turn) || closedBack(targetTurn), false, false);
    turnLayer.classList.add("is-active");
    animating = true;
    return {
      pose,
      edgeAt,
      progressFor,
      finish() {
        turn = targetTurn;
        showTurn();
        turnLayer.classList.remove("is-active");
        animating = false;
      },
      cancel() {
        drawPaper(current, emptySide(turn));
        setClosed(closedFront(turn), closedBack(turn), closedFront(turn), closedBack(turn));
        turnLayer.classList.remove("is-active");
        animating = false;
      },
    };
  }

  // Moves a prepared turn from progress `from` to `to`, then calls `done`.
  // The clock starts one frame after it is called, so painting the sheet's
  // layers never eats into the motion. Each frame advances by at most
  // MAX_FRAME_STEP, so a stalled frame (the first raster of the sheet's text
  // on the GPU takes ~50-85 ms) pauses the paper instead of letting it jump.
  function runTurn(sheet, from, to, done) {
    const duration = Math.max(MIN_SETTLE_MS, Math.abs(to - from) * TURN_MS);
    let elapsed = 0;
    let last = null;
    let shown = false;
    let request = 0;
    // md2book: the running turn can be landed at once (jump), when the next press comes during it.
    const land = () => {
      running = null;
      done();
    };
    const frame = (now) => {
      if (!shown) {
        shown = true;
        request = requestAnimationFrame(frame);
        return;
      }
      elapsed += last === null ? 0 : Math.min(now - last, MAX_FRAME_STEP);
      last = now;
      const k = Math.min(1, elapsed / duration);
      sheet.pose(from + (to - from) * k);
      if (k < 1) {
        request = requestAnimationFrame(frame);
        return;
      }
      land();
    };
    running = {
      jump() {
        cancelAnimationFrame(request);
        sheet.pose(to);
        land();
      },
    };
    request = requestAnimationFrame(frame);
  }

  function animateTurn(direction, targetTurn) {
    if (reducedMotion.matches) {
      turn = targetTurn;
      showTurn();
      return;
    }
    const sheet = startTurn(direction, targetTurn);
    runTurn(sheet, 0, 1, sheet.finish);
  }

  const lastTurn = () => Math.ceil(pageCount / pagesPerView) - 1;

  function changeTurn(direction) {
    // md2book: a press during a page turn lands it at once and turns again, so pages can be
    // skimmed; opening or closing the cover and a finger drag still make it wait.
    if (animating && running) running.jump();
    if (animating) return;
    const target = turn + direction;
    if (target >= 0 && target <= lastTurn()) turnTo(direction, target);
  }

  // In two-page spreads, leaving the closed cover opens the book and going
  // back to it closes the book; every other move is an ordinary page turn.
  function turnTo(direction, target) {
    if (pagesPerView === 2 && turn === 0 && target > 0) openBook(target);
    else if (pagesPerView === 2 && target === 0 && turn > 0) closeBook();
    else animateTurn(direction, target);
  }

  // The reader's cover state: "closed" (centred cover), "opening",
  // "closing", or "open" (the ordinary reader). While opening or closing,
  // `animating` makes every navigation input wait.
  let bookState = "open";

  function whenMoved(done) {
    window.setTimeout(() => {
      book.classList.remove("is-moving", "is-opening");
      done();
      animating = false;
      updateControls();
    }, OPEN_MS + 40);
  }

  // Opens the closed book onto `targetTurn` (the contents, or a chapter
  // chosen from the closed book). The spread is laid out at once under the
  // cover; the left half stays empty until the cover lands on it.
  function openBook(targetTurn) {
    turn = targetTurn;
    showTurn();
    if (reducedMotion.matches) return;
    animating = true;
    bookState = "opening";
    drawPaper(stackRatios(turn), "left");
    setClosed(true, false, true, false);
    book.classList.add("is-centred");
    void book.offsetWidth;
    book.classList.add("is-moving", "is-opening");
    book.classList.remove("is-centred");
    coverEl.classList.add("is-turned");
    whenMoved(() => {
      bookState = "open";
      drawPaper(stackRatios(turn), emptySide(turn));
      setClosed(closedFront(turn), closedBack(turn), false, closedBack(turn));
      coverEl.classList.remove("is-turned");
    });
  }

  // Closes the book onto its front cover: the reverse of opening, from
  // whichever spread is showing.
  function closeBook() {
    if (reducedMotion.matches) {
      turn = 0;
      showTurn();
      return;
    }
    animating = true;
    bookState = "closing";
    drawPaper(stackRatios(turn), "left");
    setClosed(true, false, true, false);
    coverEl.classList.add("is-turned");
    void book.offsetWidth;
    book.classList.add("is-moving");
    book.classList.add("is-centred");
    coverEl.classList.remove("is-turned");
    whenMoved(() => {
      turn = 0;
      showTurn();
    });
  }

  // Fullscreen covers the whole page so the toolbar, the panels (which open
  // in the top layer) and the book's viewport-based size keep working. The
  // UI always follows the browser's own fullscreen state, whether the
  // button, F, Esc or the browser itself changed it.
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const canFullscreen = Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);

  function enterFullscreen() {
    const page = document.documentElement;
    const request = page.requestFullscreen || page.webkitRequestFullscreen;
    if (!canFullscreen || fullscreenElement() || !request) return;
    Promise.resolve(request.call(page)).catch(() => {});
  }

  function exitFullscreen() {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (!fullscreenElement() || !exit) return;
    Promise.resolve(exit.call(document)).catch(() => {});
  }

  function syncFullscreen() {
    const active = Boolean(fullscreenElement());
    document.documentElement.classList.toggle("is-fullscreen", active);
    const label = active ? "Exit fullscreen" : "Enter fullscreen";
    fullscreenToggle.setAttribute("aria-label", label);
    fullscreenToggle.title = `${label} (${active ? "Esc" : "F"})`;
    showControls();
    measure();
  }

  // In fullscreen with a mouse, the toolbar and page navigation fade after a
  // pause and return on any movement, key press or focus. They stay while
  // pointed at, focused or a panel is open. Touch screens (no hover) and
  // reduced motion keep them visible.
  let hideTimer;
  function panelOpen() {
    try {
      return Boolean(document.querySelector(".reader-panel:popover-open"));
    } catch {
      return false; // No popover support, so no panel can be open.
    }
  }

  function controlsBusy() {
    // Keyboard focus keeps the bars up; focus left on a button by a click
    // does not.
    return panelOpen() ||
      [header, controls].some((bar) => bar.matches(":hover") || bar.querySelector(":focus-visible"));
  }

  function showControls() {
    document.documentElement.classList.remove("controls-hidden");
    window.clearTimeout(hideTimer);
    if (!fullscreenElement() || reducedMotion.matches || !finePointer.matches) return;
    hideTimer = window.setTimeout(() => {
      if (controlsBusy()) showControls();
      else document.documentElement.classList.add("controls-hidden");
    }, HIDE_CONTROLS_MS);
  }

  // Search finds a word or phrase in the book's chapters and lists the pages
  // it is on; choosing a result turns to that page.
  let searchTimer;
  function pageOfRange(range) {
    return Math.min(pageCount - 1, pageOf(range.getClientRects()[0] || range.getBoundingClientRect()));
  }

  function runSearch() {
    const query = searchInput.value.trim().normalize("NFC").toLocaleLowerCase();
    searchResults.replaceChildren();
    if (query.length < 2) {
      searchStatus.textContent = "";
      return;
    }
    const hits = [];
    const walker = document.createTreeWalker(flow, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node && hits.length < MAX_SEARCH_RESULTS; node = walker.nextNode()) {
      if (node.parentElement.closest("[data-front-matter]")) continue;
      const text = node.data;
      const haystack = text.toLocaleLowerCase();
      for (let at = haystack.indexOf(query); at !== -1 && hits.length < MAX_SEARCH_RESULTS;
        at = haystack.indexOf(query, at + query.length)) {
        const range = document.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + query.length);
        hits.push({ page: pageOfRange(range), before: text.slice(Math.max(0, at - SEARCH_CONTEXT), at),
          match: text.slice(at, at + query.length), after: text.slice(at + query.length, at + query.length + SEARCH_CONTEXT) });
      }
    }
    searchStatus.textContent = hits.length === 0
      ? "No matches in this book."
      : `${hits.length}${hits.length === MAX_SEARCH_RESULTS ? "+" : ""} ${hits.length === 1 ? "match" : "matches"}`;
    searchResults.replaceChildren(...hits.map((hit) => {
      const item = document.createElement("li");
      const open = document.createElement("button");
      open.type = "button";
      const mark = document.createElement("mark");
      mark.textContent = hit.match;
      open.append(`…${hit.before}`, mark, `${hit.after}…`);
      const page = document.createElement("span");
      page.className = "search-page";
      page.textContent = `page ${pageLabel(hit.page)}`;
      open.addEventListener("click", () => {
        searchPanel.hidePopover();
        goToPage(hit.page);
      });
      item.append(open, page);
      return item;
    }));
  }

  for (const panel of document.querySelectorAll(".reader-panel")) {
    // The panel's contents scroll in an inner body, so the panel itself can show its pointer.
    const body = document.createElement("div");
    body.className = "reader-panel-body";
    body.append(...panel.childNodes);
    panel.append(body);
    panel.addEventListener("beforetoggle", (event) => {
      if (event.newState === "open") placePanel(panel);
    });
  }
  window.addEventListener("resize", () => {
    const open = document.querySelector(".reader-panel:popover-open");
    if (open) placePanel(open);
  });
  makeNavigationTabs();
  bookmarkToggle.addEventListener("click", toggleBookmark);
  contentsPanel.addEventListener("toggle", (event) => {
    if (event.newState === "open") renderBookmarks();
    showControls();
  });
  // The input has autofocus, so opening the panel puts the cursor in it.
  searchPanel.addEventListener("toggle", (event) => {
    if (event.newState === "open") searchInput.select();
    showControls();
  });
  searchInput.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(runSearch, 200);
  });
  fullscreenToggle.hidden = !canFullscreen;
  fullscreenToggle.addEventListener("click", () => (fullscreenElement() ? exitFullscreen() : enterFullscreen()));
  document.addEventListener("fullscreenchange", syncFullscreen);
  document.addEventListener("webkitfullscreenchange", syncFullscreen);
  // Chrome also fires pointermove when the page moves under a still mouse
  // (for example while fullscreen resizes the window); only real movement
  // should bring the controls back.
  let lastPointer = "";
  document.addEventListener("pointermove", (event) => {
    const position = `${event.screenX},${event.screenY}`;
    if (position === lastPointer) return;
    lastPointer = position;
    showControls();
  });
  document.addEventListener("focusin", showControls);
  // Links to a chapter (contents panel, the contents page) or home turn the
  // book to that page instead of loading it again.
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const page = url.pathname === homePath ? 0 : chapterStarts.find((start) => start.href === url.pathname)?.page;
    if (page === undefined) return;
    event.preventDefault();
    link.closest(".reader-panel")?.hidePopover();
    goToPage(page);
  });
  previous.addEventListener("click", () => changeTurn(-1));
  next.addEventListener("click", () => changeTurn(1));
  textSmaller?.addEventListener("click", () => stepTextScale(-1));
  textLarger?.addEventListener("click", () => stepTextScale(1));
  desktop.addEventListener("change", measure);
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(measure, 100);
  });
  document.addEventListener("keydown", (event) => {
    showControls();
    // Leave typing and browser shortcuts (Cmd/Ctrl+F finds text) alone.
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target.closest("input, textarea, select, [contenteditable]")) return;
    if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      enterFullscreen();
    } else if (event.key === "Escape" && fullscreenElement() && !panelOpen()) {
      // With a panel open, Esc closes the panel first.
      exitFullscreen();
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      stepTextScale(1);
    } else if (event.key === "-") {
      event.preventDefault();
      stepTextScale(-1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      changeTurn(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      changeTurn(1);
    }
  });

  // Touch drags turn the page under the finger. Once a drag is clearly
  // horizontal the sheet lifts and follows it; on release the turn completes
  // if the sheet was dragged far enough or flicked, and otherwise falls back.
  // The book allows only vertical panning and pinch-zoom (touch-action), so
  // the browser leaves horizontal drags to us and still scrolls vertically.
  let drag = null;
  windowEl.addEventListener("pointerdown", (event) => {
    // A drag inside a code block scrolls the code, not the page.
    if (event.pointerType !== "touch" || drag || animating || event.target.closest("pre")) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, sheet: null,
      direction: 0, progress: 0, velocity: 0, lastX: event.clientX, lastTime: event.timeStamp, frame: 0 };
  });
  windowEl.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.direction) {
      if (Math.abs(dy) > DRAG_START_PX && Math.abs(dy) > Math.abs(dx)) {
        drag = null;
        return;
      }
      if (Math.abs(dx) < DRAG_START_PX || Math.abs(dx) < Math.abs(dy)) return;
      drag.direction = dx < 0 ? 1 : -1;
      const target = turn + drag.direction;
      // Opening or closing the book in a spread runs as one gesture; at the
      // book's first or last spread there is no sheet to lift.
      if (pagesPerView === 2 && (turn === 0 || target === 0) && target >= 0 && target <= lastTurn()) {
        drag = null;
        turnTo(target > turn ? 1 : -1, target);
        return;
      }
      if (target >= 0 && target <= lastTurn()) drag.sheet = startTurn(drag.direction, target);
      // Keep receiving moves if the finger leaves the book; capture fails if
      // the pointer has already gone, which only means no more moves come.
      try {
        windowEl.setPointerCapture(event.pointerId);
      } catch {
        // Nothing to capture.
      }
    }
    const dt = event.timeStamp - drag.lastTime;
    if (dt > 0) drag.velocity = (event.clientX - drag.lastX) / dt;
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
    if (!drag.sheet) return;
    // The sheet's outer edge stays under the finger: it starts where the
    // edge rests and moves exactly as far as the finger has. Turning back on
    // a phone, though, the incoming sheet starts a page-width beyond the
    // book's left edge, out of reach, so it follows the finger's travel
    // across the page instead and comes into view as the finger moves.
    if (drag.edge === undefined) drag.edge = drag.sheet.edgeAt(0);
    drag.travel = Math.max(0, -dx * drag.direction);
    drag.progress = pagesPerView === 1 && drag.direction < 0
      ? Math.min(1, drag.travel / (surfaces.g.page * 0.8))
      : drag.sheet.progressFor(drag.edge + dx);
    if (!drag.frame) {
      drag.frame = requestAnimationFrame(() => {
        if (!drag || !drag.sheet) return;
        drag.frame = 0;
        drag.sheet.pose(drag.progress);
      });
    }
  });
  const release = (event, cancelled) => {
    if (!drag || event.pointerId !== drag.id) return;
    const { sheet, direction, progress, velocity, frame, travel = 0 } = drag;
    drag = null;
    if (frame) cancelAnimationFrame(frame);
    if (!direction) return;
    // Velocity is px/ms along the drag; positive means toward completion.
    const toward = -velocity * direction;
    if (!sheet) return;
    // A turn completes when the sheet is well on its way, the finger has
    // travelled a quarter of a page, or it was flicked; a flick back cancels.
    const complete = !cancelled && toward > -FLICK_SPEED &&
      (progress > 0.3 || travel > surfaces.g.page * COMPLETE_TRAVEL || toward > FLICK_SPEED);
    runTurn(sheet, progress, complete ? 1 : 0, complete ? sheet.finish : sheet.cancel);
  };
  windowEl.addEventListener("pointerup", (event) => release(event, false));
  windowEl.addEventListener("pointercancel", (event) => release(event, true));
  windowEl.addEventListener("click", (event) => {
    // A click on the closed cover opens the book.
    if (bookState === "closed" && !animating &&
      event.clientX >= windowEl.getBoundingClientRect().left + windowEl.clientWidth / 2) {
      changeTurn(1);
      return;
    }
    if (event.target !== windowEl || window.getSelection().toString()) return;
    if (event.offsetX < windowEl.clientWidth * 0.25) changeTurn(-1);
    if (event.offsetX > windowEl.clientWidth * 0.75) changeTurn(1);
  });

  measure();
  // The book fonts load late on slow connections and change how the text
  // paginates, so lay the book out again once they and the page are in.
  window.addEventListener("load", measure);
  document.fonts?.ready.then(measure);
})();
