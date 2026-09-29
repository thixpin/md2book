// Development tool (spec 004 SC-001): compare our PDF with the Python toolchain's.
//   DEVBOOK=/path/to/development-book npm run equivalence:pdf
// Works in a temporary copy of development-book (the checkout is never written). Besides book-01
// it generates a 20-chapter book there (book-01's chapter twenty times, 4 parts, recto starts),
// so the page-count tolerance is measured on a book of real length. Both toolchains build the
// screen PDF of each book; ours with the reference's code line height 1.4 (the comparison measures
// engine drift only), and again with ours (1.7) to report the pages that adds. Needs the book's
// font set cached (`md2book fonts`) and Chromium. Exits 1 on a difference; KEEP=1 keeps the work dir.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadBook } from "../src/book/load.ts";
import { loadConfig } from "../src/config/load.ts";
import { buildPdf } from "../src/pdf/build.ts";
import { pdfChecks } from "../src/qa/pdf-checks.ts";
import { pdfFacts } from "../src/qa/pdf-read.ts";

const devbook = process.env.DEVBOOK;
if (!devbook) {
  console.error("equivalence:pdf: set DEVBOOK to a development-book checkout");
  process.exit(2);
}
const work = mkdtempSync(join(tmpdir(), "md2book-eqpdf-"));
const REFERENCE_CODE_LINE_HEIGHT = "pre { line-height: 1.4; }";

/** A 20-chapter book made from book-01's chapter, beside book-01 in the copy. */
function writeLongBook(copy: string): void {
  const source = readFileSync(join(copy, "book-01-dsa", "chapters", "chapter-01.md"), "utf8");
  const body = source.slice(source.indexOf("\n") + 1);
  const digits = "၀၁၂၃၄၅၆၇၈၉";
  const burmese = (n: number) => [...String(n)].map((d) => digits[Number(d)]).join("");
  const dir = join(copy, "book-20", "chapters");
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(copy, "book-20", "cover"), { recursive: true });
  cpSync(
    join(copy, "book-01-dsa", "cover", "cover.png"),
    join(copy, "book-20", "cover", "cover.png"),
  );
  for (let n = 1; n <= 20; n++) {
    const name = `chapter-${String(n).padStart(2, "0")}.md`;
    writeFileSync(join(dir, name), `# အခန်း (${burmese(n)}) - Chapter ${n}\n${body}`);
  }
  for (let p = 0; p < 4; p++) {
    const roman = ["I", "II", "III", "IV"][p];
    writeFileSync(
      join(dir, `part-0${p + 1}.md`),
      `# Part ${roman} - Part ${p + 1}\n\nchapters: ${p * 5 + 1}-${p * 5 + 5}\n`,
    );
  }
  const base = JSON.parse(
    readFileSync(join(copy, "publish", "books", "book-01.json"), "utf8"),
  ) as Record<string, unknown>;
  for (const key of ["back_cover", "favicon", "web_url", "web_published_chapters"])
    delete base[key];
  const config = {
    ...base,
    title: "Twenty Chapters",
    output_name: "Book-20",
    cover: "../../book-20/cover/cover.png",
    chapter_glob: "../../book-20/chapters/chapter-*.md",
    part_glob: "../../book-20/chapters/part-*.md",
    recto_chapter_start: true,
  };
  writeFileSync(join(copy, "publish", "books", "book-20.json"), JSON.stringify(config, null, 1));
}

try {
  const copy = join(work, "reference");
  const skip = (src: string) => !src.includes("node_modules");
  for (const dir of [
    "publish",
    "code",
    ...readdirSync(devbook).filter((d) => d.startsWith("book-")),
  ]) {
    if (existsSync(join(devbook, dir)))
      cpSync(join(devbook, dir), join(copy, dir), { recursive: true, filter: skip });
  }
  // The copy has no .git, so point the code root (default: the repository root) at it.
  const book01 = join(copy, "publish", "books", "book-01.json");
  writeFileSync(
    book01,
    JSON.stringify({ ...JSON.parse(readFileSync(book01, "utf8")), code_root: "../.." }),
  );
  writeLongBook(copy);
  const venv = join(devbook, ".venv", "bin", "python");
  const python = process.env.DEVBOOK_PYTHON ?? (existsSync(venv) ? venv : "python3");

  const failures: string[] = [];
  for (const name of ["book-01", "book-20"]) {
    execFileSync(python, [join(copy, "publish", "build.py"), "pdf", "--book", name], {
      stdio: "pipe",
    });
    const { config } = await loadConfig(join(copy, "publish", "books", `${name}.json`));
    const book = await loadBook(config);
    const reference = await pdfFacts(join(copy, "dist", name, `${config.output_name}-170x240.pdf`));
    const out = join(work, "ours", name);
    const { file } = await buildPdf(book, {
      out,
      printed: false,
      extraCss: REFERENCE_CODE_LINE_HEIGHT,
    });
    const ours = await pdfFacts(file);
    const checks = pdfChecks(ours, book.chapters, false);
    const { file: shipped } = await buildPdf(book, { out: join(out, "shipped"), printed: false });
    const shippedPages = (await pdfFacts(shipped)).pages;

    const fail = (message: string) => failures.push(`${name}: ${message}`);
    if (JSON.stringify(ours.sizeMm) !== JSON.stringify(reference.sizeMm))
      fail(`page size ${ours.sizeMm.join(" x ")} mm, python ${reference.sizeMm.join(" x ")} mm`);
    const allowed = Math.max(1, Math.round(reference.pages * 0.02));
    if (Math.abs(ours.pages - reference.pages) > allowed)
      fail(`${ours.pages} pages, python ${reference.pages} (allowed ±${allowed})`);
    if (checks.chapterStarts.size !== book.chapters.length)
      fail(`chapter openings ${checks.chapterStarts.size} of ${book.chapters.length}`);
    if (config.recto_chapter_start) {
      for (const [slug, page] of checks.chapterStarts)
        if (page % 2 === 0) fail(`${slug} opens on left-hand page ${page}`);
    }
    if (checks.replacement) fail(`${checks.replacement} replacement characters`);
    const source = new Set([
      ...book.chapters.map((ch) => ch.plainText ?? "").join(""),
      ...config.title,
    ]);
    for (const [c] of checks.stray)
      if (!source.has(c)) fail(`stray ${JSON.stringify(c)} is not in the manuscript`);

    console.log(
      `equivalence:pdf ${name}: ${ours.pages} pages (python ${reference.pages}; with code line height 1.7: ${shippedPages}), ` +
        `${ours.sizeMm.join(" x ")} mm, ${checks.chapterStarts.size}/${book.chapters.length} chapter openings`,
    );
  }
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log(
    failures.length
      ? `${failures.length} difference(s)`
      : "SC-001: PDF equivalent to the Python toolchain",
  );
  process.exitCode = failures.length ? 1 : 0;
} finally {
  if (process.env.KEEP) console.log("kept", work);
  else rmSync(work, { recursive: true, force: true });
}
