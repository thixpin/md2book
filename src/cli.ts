import { readFileSync } from "node:fs";
import { Writable } from "node:stream";
import { Command, CommanderError } from "commander";
import { BookError } from "./errors.ts";
import type { InitAnswers } from "./init/prompts.ts";

// Each command imports its module when it runs, so `--help` and `--version` load only commander
// and not the build dependencies (Playwright, pdf.js, Paged.js, sharp, Prism, …).

// package.json sits one folder up from both src/cli.ts and the built dist/cli.js.
const VERSION = (
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;

export interface CliDeps {
  stdout?: (text: string) => void;
  stderr?: (text: string) => void;
  /** Test-only: font manifest to use instead of the shipped one. Not a flag or env var. */
  manifestPath?: string;
  /** Defaults to process.stdin; prompts only when it is a TTY. */
  stdin?: { isTTY?: boolean } & Partial<NodeJS.ReadableStream>;
}

/** Runs `md2book` with user arguments (no node/script prefix); resolves to the exit code. */
export async function runCli(argv: string[], deps: CliDeps = {}): Promise<number> {
  const stdout = deps.stdout ?? ((text: string) => process.stdout.write(text));
  const stderr = deps.stderr ?? ((text: string) => process.stderr.write(text));

  const program = new Command("md2book")
    .description("Build books from Markdown manuscripts.")
    .version(VERSION, "-v, --version", "print the md2book version")
    .exitOverride()
    .configureOutput({ writeOut: stdout, writeErr: stderr });

  program
    .command("init")
    .description("Create a new book project: book.json and a first chapter.")
    .argument("[dir]", "target directory", ".")
    .option("-l, --lang <lang>", "book language: my (Myanmar; mm accepted) or en (English)")
    .option("--font <set>", "font set: sans (default) or serif")
    .option("-t, --title <text>", "book title")
    .option("-a, --author <text>", "book author")
    .option("-p, --page-size <size>", "PDF page size: default (170 × 240 mm), a5, b5, a4 or letter")
    .option("-f, --font-family <id>", "font family, for example noto-sans-myanmar")
    .option("-s, --font-size <size>", "PDF font size: xs, s, m (default), l or xl")
    .option("--chapters <folder>", "chapter folder inside the book folder (default chapters)")
    .action(async (dir: string, flags: InitAnswers) => {
      const stdin = deps.stdin ?? process.stdin;
      let answers = flags;
      if (stdin.isTTY) {
        const { promptMissing } = await import("./init/prompts.ts");
        answers = await promptMissing(flags, {
          input: stdin as NodeJS.ReadableStream,
          output: new Writable({
            write(chunk: Buffer, _encoding, done) {
              stdout(chunk.toString());
              done();
            },
          }),
        });
      } else {
        for (const key of ["lang", "title", "author"] as const) {
          if (!flags[key])
            throw new BookError(`--${key}`, "required when not running in a terminal");
        }
      }
      const { runInit } = await import("./init/init.ts");
      const { files } = await runInit({
        dir,
        lang: answers.lang!,
        font: answers.font,
        fontFamily: answers.fontFamily,
        pageSize: answers.pageSize,
        fontSize: answers.fontSize,
        chapters: answers.chapters,
        title: answers.title!,
        author: answers.author!,
      });
      stdout(`${files.map((file) => `created ${file}`).join("\n")}\n`);
      stdout(`Add a cover image, then fetch the fonts:\n  md2book fonts --config ${files[0]}\n`);
    });

  program
    .command("fonts")
    .description("Fetch and verify the book's font set into the local cache.")
    .option(
      "-c, --config <path>",
      "book config (default book.json); its language and font_set pick the set",
    )
    .option("-s, --set <id>", "font set id: my-sans, my-serif, en-sans, en-serif")
    .option("--fonts <dir>", "font cache root (overrides MD2BOOK_FONTS)")
    .action(async (options: { config?: string; set?: string; fonts?: string }) => {
      const { runFonts } = await import("./fonts/command.ts");
      const { dir } = await runFonts(
        { config: options.config, set: options.set, fontsDir: options.fonts },
        deps.manifestPath,
      );
      stdout(`${dir}\n`);
    });

  const build = program.command("build").description("Build an edition of the book.");

  build
    .command("pdf")
    .description("Build the 170 × 240 mm PDF (screen edition, or --printed for the print shop).")
    .option("-c, --config <path>", "book config", "book.json")
    .option("-o, --out <dir>", "output directory (default dist/<config name>/)")
    .option("-p, --printed", "print-shop interior: no cover page, no colour")
    .action(async (options: { config: string; out?: string; printed?: boolean }) => {
      const { runPdf } = await import("./pdf/command.ts");
      await runPdf(options, deps.manifestPath, (line) => stdout(`${line}\n`));
    });

  build
    .command("epub")
    .description("Build the reflowable EPUB 3 of the whole book.")
    .option("-c, --config <path>", "book config", "book.json")
    .option("-o, --out <dir>", "output directory (default dist/<config name>/)")
    .action(async (options: { config: string; out?: string }) => {
      const { runEpub } = await import("./epub/command.ts");
      await runEpub(options, deps.manifestPath, (line) => stdout(`${line}\n`));
    });

  program
    .command("qa")
    .description("Write QA-REPORT.md: manuscript, Unicode, typeface, PDF and EPUB checks.")
    .option("-c, --config <path>", "book config", "book.json")
    .option("-o, --out <dir>", "output directory (default dist/<config name>/)")
    .option("-p, --printed", "check the printed edition's PDF")
    .action(async (options: { config: string; out?: string; printed?: boolean }) => {
      const { runQa } = await import("./qa/command.ts");
      await runQa(options, deps.manifestPath, (line) => stdout(`${line}\n`));
    });

  build
    .command("all")
    .description("Build the PDF, the EPUB and the web edition, then write the QA report.")
    .option("-c, --config <path>", "book config", "book.json")
    .option("-o, --out <dir>", "output directory (default dist/<config name>/)")
    .option("-p, --printed", "build and check the printed edition's PDF")
    .action(async (options: { config: string; out?: string; printed?: boolean }) => {
      const { runAll } = await import("./qa/command.ts");
      await runAll(options, deps.manifestPath, (line) => stdout(`${line}\n`));
    });

  build
    .command("web")
    .description("Build the static web edition of the published chapters.")
    .option("-c, --config <path>", "book config", "book.json")
    .option("-o, --out <dir>", "output directory (default dist/<config name>/)")
    .option("--web-url <url>", "the site's public URL for this build, in place of web_url")
    .action(async (options: { config: string; out?: string; webUrl?: string }) => {
      const { runWeb, webWrittenLine } = await import("./web/command.ts");
      stdout(`${webWrittenLine(await runWeb(options, deps.manifestPath))}\n`);
    });

  program
    .command("serve")
    .description("Build the web edition and preview it at http://127.0.0.1:<port>/.")
    .option("-c, --config <path>", "book config", "book.json")
    .option("-o, --out <dir>", "output directory (default dist/<config name>/)")
    .option("-p, --port <n>", "port on 127.0.0.1", "8000")
    .option("--web-url <url>", "the site's public URL for this build, in place of web_url")
    .action(async (options: { config: string; out?: string; port: string; webUrl?: string }) => {
      const port = Number(options.port);
      if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new BookError("--port", `not a valid port: ${options.port}`);
      }
      const { runServe } = await import("./web/command.ts");
      const served = await runServe({ ...options, port }, deps.manifestPath);
      stdout(`Serving ${served.url} (Ctrl+C to stop)\n`);
      await new Promise<void>((done) =>
        process.once("SIGINT", () => void served.close().then(done)),
      );
    });

  program
    .command("deploy")
    .description("Set up publishing of the web edition.")
    .command("github-pages")
    .description(
      "Write a GitHub Actions workflow that builds the web edition and deploys it to GitHub Pages.",
    )
    .option("-c, --config <path>", "book config", "book.json")
    .option("-f, --force", "replace an existing workflow")
    .action(async (options: { config: string; force?: boolean }) => {
      const { runGithubPages } = await import("./deploy/github-pages.ts");
      const { file, webUrl } = await runGithubPages(options, VERSION);
      stdout(
        `created ${file}\n` +
          `Site URL: ${webUrl ?? "the one GitHub Pages reports (set web_url for a custom domain)"}\n` +
          "Next:\n" +
          "  1. On GitHub: Settings → Pages → Build and deployment → Source: GitHub Actions\n" +
          "  2. Settings → Environments → github-pages → Deployment branches and tags:\n" +
          "     add a tag rule v*\n" +
          "  3. Commit and push the workflow\n" +
          "  4. Tag a release to deploy: git tag v1.0.0 && git push origin v1.0.0\n",
      );
    });

  program
    .command("cover")
    .description("Render a one-page HTML cover to PNG with the book fonts.")
    .argument("<file>", "cover HTML file")
    .option("-o, --output <png>", "PNG to write (default cover.png next to the HTML)")
    .option("-d, --dpi <n>", "resolution in dots per inch", "300")
    .option(
      "-c, --config <path>",
      "book config (default book.json); its language and font_set pick the fonts",
    )
    .option("-s, --set <id>", "font set id instead of a config")
    .option("--fonts <dir>", "font cache root (overrides MD2BOOK_FONTS)")
    .action(
      async (
        file: string,
        options: { output?: string; dpi: string; config?: string; set?: string; fonts?: string },
      ) => {
        if (!/^\d+$/.test(options.dpi)) {
          throw new BookError("--dpi", `not a resolution in dots per inch: ${options.dpi}`);
        }
        const { runCover } = await import("./cover/command.ts");
        const result = await runCover(
          {
            html: file,
            output: options.output,
            dpi: Number(options.dpi),
            config: options.config,
            set: options.set,
            fontsDir: options.fonts,
          },
          deps.manifestPath,
        );
        stdout(
          `Cover written: ${result.file} (${result.width} x ${result.height} px, ${options.dpi} dpi)\n`,
        );
      },
    );

  try {
    await program.parseAsync(argv, { from: "user" });
    return 0;
  } catch (error) {
    if (error instanceof BookError) {
      stderr(`${error.message}\n`);
      return 1;
    }
    if (error instanceof CommanderError) {
      return error.exitCode;
    }
    throw error;
  }
}
