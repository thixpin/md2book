// Development tool (spec 002 SC-001): compare our web edition with the Python toolchain's.
//   DEVBOOK=/path/to/development-book npm run equivalence:web -- --book book-01
// Copies the reference `publish/`, the book folder and `code/` (without node_modules) into a temp
// dir and runs `web.py build` there, so the checkout is never written. Builds ours from the same
// config (the configured font set must be in the font cache: `book-build fonts`). Compares file
// trees with hash segments masked, and the DOM skeleton (tags, classes, attribute names) of
// index.html and chapters/ch01.html. Highlighted code inside <pre> is compared as one opaque
// element: token spans differ by design (Prism vs Pygments, docs/decision-log.md). Exits 1 on differences not listed in docs/decision-log.md.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { loadConfig } from "../src/config/load.ts";
import { buildWeb } from "../src/web/build.ts";
import { skeleton } from "../test/helpers/html.ts";

// Deliberate differences recorded in docs/decision-log.md.
const ALLOWED_EXTRA = new Set(["fonts/LICENSE-OFL.txt"]);

const { values } = parseArgs({ options: { book: { type: "string", default: "book-01" } } });
const devbook = process.env.DEVBOOK;
if (!devbook) {
  console.error("equivalence:web: set DEVBOOK to a development-book checkout");
  process.exit(2);
}
const book = values.book;
const work = mkdtempSync(join(tmpdir(), "md2book-eqweb-"));

try {
  // Reference build in a scratch copy.
  const copy = join(work, "reference");
  const skip = (src: string) =>
    !src.includes("node_modules") && !src.includes(`${join("publish", ".venv")}`);
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
  execFileSync(python, [join(copy, "publish", "web.py"), "build", "--book", book], {
    stdio: "pipe",
  });
  const reference = join(copy, "dist", book, "web");

  // Ours, from the checkout's config (read-only), into the scratch dir.
  const { config } = await loadConfig(join(devbook, "publish", "books", `${book}.json`));
  const { dir: ours } = await buildWeb(config, { out: join(work, "ours", book) });

  const mask = (f: string) => f.replace(/\.[0-9a-f]{12}\./, ".<hash>.");
  const tree = (dir: string) =>
    readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => mask(join(e.parentPath, e.name).slice(dir.length + 1)))
      .sort();
  const failures: string[] = [];
  const [ref, act] = [tree(reference), tree(ours)];
  for (const f of ref) if (!act.includes(f)) failures.push(`missing in ours: ${f}`);
  for (const f of act)
    if (!ref.includes(f) && !ALLOWED_EXTRA.has(f)) failures.push(`extra in ours: ${f}`);

  for (const page of ["index.html", "chapters/ch01.html"]) {
    const a = skeleton(readFileSync(join(reference, page), "utf8"), ["pre"]);
    const b = skeleton(readFileSync(join(ours, page), "utf8"), ["pre"]);
    const at = a.findIndex((node, i) => node !== b[i]);
    if (at !== -1 || a.length !== b.length) {
      failures.push(`${page} DOM differs at element ${at}: python ${a[at]} / ours ${b[at]}`);
    }
  }

  console.log(`equivalence:web ${book}: ${ref.length} reference files, ${act.length} ours`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log(
    failures.length ? `${failures.length} difference(s)` : "SC-001: file tree and DOM identical",
  );
  process.exitCode = failures.length ? 1 : 0;
} finally {
  rmSync(work, { recursive: true, force: true });
}
