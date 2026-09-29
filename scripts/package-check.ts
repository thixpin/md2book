// Release check (spec 005 FR-009): pack the package, install the tarball into an empty project and
// run the CLI from that install: --help lists every command, init creates a book, and the demo
// book's EPUB builds.   npm run package:check
// Only installing the dependencies uses the network. Fonts come from MD2BOOK_FONTS_SOURCE when
// set, else the maintainer's build/fonts, else the fonts-v1 release (as `md2book fonts` does).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const work = mkdtempSync(join(tmpdir(), "md2book-package-"));

function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = {}): string {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function step(label: string, check: () => void): void {
  process.stdout.write(`package:check ${label} … `);
  check();
  process.stdout.write("ok\n");
}

try {
  let tarball = "";
  step("pack", () => {
    run("npm", ["run", "-s", "build"], ROOT);
    run("npm", ["pack", "--pack-destination", work, "--ignore-scripts"], ROOT);
    tarball = join(
      work,
      readdirSync(work).find((name) => name.endsWith(".tgz"))!,
    );
  });

  const project = join(work, "project");
  mkdirSync(project);
  step("install", () => {
    run("npm", ["init", "-y"], project);
    run("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline", tarball], project);
  });
  const bin = join(project, "node_modules", ".bin", "md2book");

  step("--help", () => {
    const help = run(bin, ["--help"], project);
    for (const command of ["init", "fonts", "build", "qa", "serve", "cover"]) {
      if (!help.includes(`  ${command}`)) throw new Error(`--help does not list ${command}`);
    }
  });

  step("init", () => {
    run(bin, ["init", "new-book", "--lang", "my", "--title", "စမ်းသပ်", "--author", "A"], project);
    if (!existsSync(join(project, "new-book", "book.json")))
      throw new Error("init wrote no book.json");
  });

  step("build epub (examples/demo-book)", () => {
    const demo = join(project, "demo-book");
    cpSync(join(ROOT, "examples", "demo-book"), demo, { recursive: true });
    const localFonts = join(ROOT, "build", "fonts");
    const env: NodeJS.ProcessEnv = { MD2BOOK_FONTS: join(work, "fonts") };
    if (!process.env.MD2BOOK_FONTS_SOURCE && existsSync(localFonts))
      env.MD2BOOK_FONTS_SOURCE = localFonts;
    run(bin, ["fonts", "--config", "book.json"], demo, env);
    run(bin, ["build", "epub", "--config", "book.json", "--out", "dist"], demo, env);
    if (!existsSync(join(demo, "dist", "python.epub"))) throw new Error("no EPUB written");
  });

  console.log("package:check passed");
} catch (error) {
  const detail = error as { stderr?: string; message: string };
  console.error(`\n${detail.stderr?.trim() || detail.message}`);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
