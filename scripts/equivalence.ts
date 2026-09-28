// Development tool (SC-001–SC-003): compare our manuscript pipeline with the Python toolchain.
//   DEVBOOK=/path/to/development-book npm run equivalence -- --book book-01
// Runs scripts/dump-python-reference.py (Python: $DEVBOOK_PYTHON, else $DEVBOOK/.venv/bin/python,
// else python3), runs our pipeline on the same config, and exits 1 on any difference. The
// manuscript is read in place and never copied into this repository.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { loadConfig } from "../src/config/load.ts";
import { loadChapters } from "../src/manuscript/chapters.ts";
import { loadParts } from "../src/manuscript/parts.ts";
import { expandSnippets } from "../src/manuscript/snippets.ts";
import { renderChapter } from "../src/markdown/render.ts";

interface ChapterData {
  index: number;
  slug: string;
  label: string;
  title: string;
  number: number;
  sections: string[];
  part: string | null;
  includes: string[];
  plain_text: string;
  counts: Record<string, number>;
}

function counts(html: string): Record<string, number> {
  const pres = [...html.matchAll(/<pre(?: class="([^"]*)")?>/g)].map((m) =>
    (m[1] ?? "").split(" "),
  );
  const count = (text: string) => html.split(text).length - 1;
  return {
    terminal: count('<div class="terminal">'),
    code: pres.filter((c) => c.includes("code")).length,
    wide: pres.filter((c) => c.includes("wide")).length,
    xwide: pres.filter((c) => c.includes("xwide")).length,
    table: count("<table"),
    callout_note: count("callout-note"),
    callout_warning: count("callout-warning"),
    callout_try: count("callout-try"),
  };
}

async function ours(configPath: string): Promise<ChapterData[]> {
  const { config } = await loadConfig(configPath);
  const chapters = await loadChapters(config);
  const parts = await loadParts(config, chapters);
  return chapters.map((ch) => {
    expandSnippets(ch, config.code_root);
    renderChapter(ch, config.strings);
    return {
      index: ch.index,
      slug: ch.slug,
      label: ch.label,
      title: ch.title,
      number: ch.number,
      sections: ch.sections,
      part: parts.find((p) => p.chapters.includes(ch))?.label ?? null,
      includes: (ch.includes ?? []).map((i) => i.ref),
      plain_text: ch.plainText ?? "",
      counts: counts(ch.html ?? ""),
    };
  });
}

function python(devbook: string, book: string): ChapterData[] {
  const venv = join(devbook, ".venv", "bin", "python");
  const interpreter = process.env.DEVBOOK_PYTHON ?? (existsSync(venv) ? venv : "python3");
  const script = new URL("dump-python-reference.py", import.meta.url).pathname;
  const out = execFileSync(interpreter, [script, book], {
    encoding: "utf8",
    env: { ...process.env, DEVBOOK: devbook },
  });
  return (JSON.parse(out) as { chapters: ChapterData[] }).chapters;
}

const squash = (text: string) => text.replace(/\s+/gu, "");

const { values } = parseArgs({ options: { book: { type: "string", default: "book-01" } } });
const devbook = process.env.DEVBOOK;
if (!devbook) {
  console.error("equivalence: set DEVBOOK to a development-book checkout");
  process.exit(2);
}
const book = values.book;
const reference = python(devbook, book);
const actual = await ours(join(devbook, "publish", "books", `${book}.json`));

const failures: string[] = [];
if (reference.length !== actual.length) {
  failures.push(`SC-001 chapter count: python ${reference.length}, ours ${actual.length}`);
}
for (const [i, py] of reference.entries()) {
  const js = actual[i];
  if (!js) continue;
  for (const key of [
    "index",
    "slug",
    "label",
    "title",
    "number",
    "sections",
    "part",
    "includes",
  ] as const) {
    if (JSON.stringify(py[key]) !== JSON.stringify(js[key])) {
      failures.push(
        `SC-001 ${py.slug}.${key}: python ${JSON.stringify(py[key])}, ours ${JSON.stringify(js[key])}`,
      );
    }
  }
  if (squash(py.plain_text) !== squash(js.plain_text)) {
    const a = squash(py.plain_text);
    const b = squash(js.plain_text);
    let at = 0;
    while (a[at] === b[at]) at++;
    failures.push(
      `SC-002 ${py.slug} plain text differs at ${at}: python ${JSON.stringify(a.slice(at, at + 40))}, ours ${JSON.stringify(b.slice(at, at + 40))}`,
    );
  }
  for (const [key, value] of Object.entries(py.counts)) {
    if (js.counts[key] !== value) {
      failures.push(`SC-003 ${py.slug} ${key}: python ${value}, ours ${js.counts[key]}`);
    }
  }
}

console.log(`equivalence ${book}: ${reference.length} chapters compared`);
for (const failure of failures) console.log(`  ✗ ${failure}`);
console.log(
  failures.length ? `${failures.length} difference(s)` : "SC-001, SC-002, SC-003: identical",
);
process.exit(failures.length ? 1 : 0);
