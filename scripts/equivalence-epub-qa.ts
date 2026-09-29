// Development tool (spec 003 SC-001–SC-003): compare our EPUB and QA report with the Python
// toolchain's.   DEVBOOK=/path/to/development-book npm run equivalence:epub-qa -- --book book-01
// Runs `build.py epub` and `build.py qa` in a temporary copy (the checkout is never written) and
// ours from the same config (the font set must be cached: `md2book fonts`). Compares the
// spine order, nav and NCX documents, the manifest file set, per-chapter text, and the report's
// manuscript counts, Unicode issues and coverage numbers. Exits 1 on differences not recorded in
// docs/decision-log.md.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { decodeHTML } from "entities";
import { runAll } from "../src/qa/command.ts";

const { values } = parseArgs({ options: { book: { type: "string", default: "book-01" } } });
const devbook = process.env.DEVBOOK;
if (!devbook) {
  console.error("equivalence:epub-qa: set DEVBOOK to a development-book checkout");
  process.exit(2);
}
const book = values.book;
const work = mkdtempSync(join(tmpdir(), "md2book-eqepub-"));

const read = (path: string) => readFileSync(path, "utf8");
const spine = (opf: string) => [...opf.matchAll(/<itemref idref="([^"]+)"/g)].map((m) => m[1]);
const hrefs = (opf: string) => [...opf.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).sort();
const bodyText = (xhtml: string) =>
  decodeHTML(xhtml.slice(xhtml.indexOf("</header>") + 9).replace(/<[^>]+>/g, "")).replace(
    /\s/gu,
    "",
  );
/** Report lines that must match: manuscript bullets and table, Unicode issues, coverage counts. */
function reportFacts(report: string): string[] {
  const section = (title: string) => {
    const start = report.indexOf(`## ${title}`);
    const end = report.indexOf("\n## ", start + 3);
    return report.slice(start, end === -1 ? undefined : end).split("\n");
  };
  return [
    ...section("Manuscript").filter((l) => l.startsWith("- ") || l.startsWith("| ")),
    ...section("Unicode / Burmese text checks")
      .filter((l) => l.startsWith("- "))
      // Recorded wording change (docs/decision-log.md, spec 003 clarification).
      .map((l) =>
        l.replace(
          "(author's convention after Latin words; not changed)",
          "(reported, not changed)",
        ),
      ),
    ...section("Typeface coverage").filter((l) => /^- (Myanmar-script|Latin)|^ {2}- U\+/.test(l)),
  ];
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
  const venv = join(devbook, ".venv", "bin", "python");
  const python = process.env.DEVBOOK_PYTHON ?? (existsSync(venv) ? venv : "python3");
  for (const target of ["epub", "qa"]) {
    execFileSync(python, [join(copy, "publish", "build.py"), target, "--book", book], {
      stdio: "pipe",
    });
  }
  const refDist = join(copy, "dist", book);
  const ourDist = join(work, "ours", book);
  await runAll({ config: join(devbook, "publish", "books", `${book}.json`), out: ourDist });

  const failures: string[] = [];
  const check = (label: string, a: unknown, b: unknown) => {
    if (JSON.stringify(a) !== JSON.stringify(b))
      failures.push(`${label}: python ${JSON.stringify(a)} / ours ${JSON.stringify(b)}`);
  };
  const ref = (p: string) => read(join(refDist, "src", "epub", p));
  const ours = (p: string) => read(join(ourDist, "src", "epub", p));
  check("spine order", spine(ref("OEBPS/content.opf")), spine(ours("OEBPS/content.opf")));
  check("manifest files", hrefs(ref("OEBPS/content.opf")), hrefs(ours("OEBPS/content.opf")));
  check("toc.ncx", ref("OEBPS/toc.ncx"), ours("OEBPS/toc.ncx"));
  check("nav.xhtml", ref("OEBPS/text/nav.xhtml"), ours("OEBPS/text/nav.xhtml"));
  for (const file of readdirSync(join(refDist, "src", "epub", "OEBPS", "text")).filter((f) =>
    /^ch\d\d\.xhtml$/.test(f),
  )) {
    check(
      `text ${file}`,
      bodyText(ref(`OEBPS/text/${file}`)),
      bodyText(ours(`OEBPS/text/${file}`)),
    );
  }
  const refFacts = reportFacts(read(join(refDist, "QA-REPORT.md")));
  const ourFacts = reportFacts(read(join(ourDist, "QA-REPORT.md")));
  // Recorded difference (docs/decision-log.md, spec 003 SC-003): whitespace-dependent counts.
  const KNOWN = [/^- Approximate word count/, /^- Character count \(incl\. spaces\)/];
  const known: string[] = [];
  const max = Math.max(refFacts.length, ourFacts.length);
  for (let i = 0; i < max; i++) {
    if (refFacts[i] === ourFacts[i]) continue;
    const line = `QA line ${i}: python ${JSON.stringify(refFacts[i])} / ours ${JSON.stringify(ourFacts[i])}`;
    if (KNOWN.some((re) => re.test(refFacts[i] ?? "") && re.test(ourFacts[i] ?? "")))
      known.push(line);
    else failures.push(line);
  }

  console.log(`equivalence:epub-qa ${book}: ${refFacts.length} QA facts compared`);
  for (const k of known) console.log(`  ~ known difference: ${k}`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log(
    failures.length
      ? `${failures.length} difference(s)`
      : "SC-001–SC-003: EPUB structure, chapter text and QA facts identical",
  );
  process.exitCode = failures.length ? 1 : 0;
} finally {
  rmSync(work, { recursive: true, force: true });
}
