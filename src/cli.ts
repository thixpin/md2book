import { readFileSync } from "node:fs";
import { Writable } from "node:stream";
import { Command, CommanderError } from "commander";
import { BookError } from "./errors.ts";
import { runFonts } from "./fonts/command.ts";
import { runInit } from "./init/init.ts";
import { promptMissing, type InitAnswers } from "./init/prompts.ts";
import { runServe, runWeb, webWrittenLine } from "./web/command.ts";
import { runEpub } from "./epub/command.ts";
import { runPdf } from "./pdf/command.ts";
import { runCover } from "./cover/command.ts";
import { runAll, runQa } from "./qa/command.ts";

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
      await runPdf(options, deps.manifestPath, (line) => stdout(`${line}\n`));
    });

  build
    .command("epub")
    .description("Build the reflowable EPUB 3 of the whole book.")
    .option("-c, --config <path>", "book config", "book.json")
    .option("-o, --out <dir>", "output directory (default dist/<config name>/)")
    .action(async (options: { config: string; out?: string }) => {
      await runEpub(options, deps.manifestPath, (line) => stdout(`${line}\n`));
    });

  program
    .command("qa")
    .description("Write QA-REPORT.md: manuscript, Unicode, typeface, PDF and EPUB checks.")
    .option("-c, --config <path>", "book config", "book.json")
    .option("-o, --out <dir>", "output directory (default dist/<config name>/)")
    .option("-p, --printed", "check the printed edition's PDF")
    .action(async (options: { config: string; out?: string; printed?: boolean }) => {
      await runQa(options, deps.manifestPath, (line) => stdout(`${line}\n`));
    });

  build
    .command("all")
    .description("Build the PDF, the EPUB and the web edition, then write the QA report.")
    .option("-c, --config <path>", "book config", "book.json")
    .option("-o, --out <dir>", "output directory (default dist/<config name>/)")
    .option("-p, --printed", "build and check the printed edition's PDF")
    .action(async (options: { config: string; out?: string; printed?: boolean }) => {
      await runAll(options, deps.manifestPath, (line) => stdout(`${line}\n`));
    });

  build
    .command("web")
    .description("Build the static web edition of the published chapters.")
    .option("-c, --config <path>", "book config", "book.json")
    .option("-o, --out <dir>", "output directory (default dist/<config name>/)")
    .action(async (options: { config: string; out?: string }) => {
      stdout(`${webWrittenLine(await runWeb(options, deps.manifestPath))}\n`);
    });

  program
    .command("serve")
    .description("Build the web edition and preview it at http://127.0.0.1:<port>/.")
    .option("-c, --config <path>", "book config", "book.json")
    .option("-o, --out <dir>", "output directory (default dist/<config name>/)")
    .option("-p, --port <n>", "port on 127.0.0.1", "8000")
    .action(async (options: { config: string; out?: string; port: string }) => {
      const port = Number(options.port);
      if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new BookError("--port", `not a valid port: ${options.port}`);
      }
      const served = await runServe({ ...options, port }, deps.manifestPath);
      stdout(`Serving ${served.url} (Ctrl+C to stop)\n`);
      await new Promise<void>((done) =>
        process.once("SIGINT", () => void served.close().then(done)),
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
