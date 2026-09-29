import { Command, CommanderError } from "commander";
import { BookError } from "./errors.ts";
import { runFonts } from "./fonts/command.ts";
import { runInit } from "./init/init.ts";
import { promptMissing, type InitAnswers } from "./init/prompts.ts";
import { runServe, runWeb, webWrittenLine } from "./web/command.ts";
import { runEpub } from "./epub/command.ts";
import { runPdf } from "./pdf/command.ts";
import { runAll, runQa } from "./qa/command.ts";

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
    .exitOverride()
    .configureOutput({ writeOut: stdout, writeErr: stderr });

  program
    .command("init")
    .description("Create a new book project: book.json and chapters/chapter-01.md.")
    .argument("[dir]", "target directory", ".")
    .option("--lang <lang>", "book language: my (Myanmar; mm accepted) or en (English)")
    .option("--font <set>", "font set: sans (default) or serif")
    .option("--title <text>", "book title")
    .option("--author <text>", "book author")
    .action(async (dir: string, flags: InitAnswers) => {
      const stdin = deps.stdin ?? process.stdin;
      let answers = flags;
      if (stdin.isTTY) {
        answers = await promptMissing(flags, {
          input: stdin as NodeJS.ReadableStream,
          output: process.stdout,
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
        title: answers.title!,
        author: answers.author!,
      });
      stdout(`${files.map((file) => `created ${file}`).join("\n")}\n`);
      stdout(`Add a cover image, then fetch the fonts:\n  md2book fonts --config ${files[0]}\n`);
    });

  program
    .command("fonts")
    .description("Fetch and verify the book's font set into the local cache.")
    .option("--config <path>", "book config; its language and font_set pick the set")
    .option("--set <id>", "font set id: my-sans, my-serif, en-sans, en-serif")
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
    .requiredOption("--config <path>", "book config")
    .option("--out <dir>", "output directory (default dist/<config name>/)")
    .option("--printed", "print-shop interior: no cover page, no colour")
    .action(async (options: { config: string; out?: string; printed?: boolean }) => {
      await runPdf(options, deps.manifestPath, (line) => stdout(`${line}\n`));
    });

  build
    .command("epub")
    .description("Build the reflowable EPUB 3 of the whole book.")
    .requiredOption("--config <path>", "book config")
    .option("--out <dir>", "output directory (default dist/<config name>/)")
    .action(async (options: { config: string; out?: string }) => {
      await runEpub(options, deps.manifestPath, (line) => stdout(`${line}\n`));
    });

  program
    .command("qa")
    .description("Write QA-REPORT.md: manuscript, Unicode, typeface, PDF and EPUB checks.")
    .requiredOption("--config <path>", "book config")
    .option("--out <dir>", "output directory (default dist/<config name>/)")
    .option("--printed", "check the printed edition's PDF")
    .action(async (options: { config: string; out?: string; printed?: boolean }) => {
      await runQa(options, deps.manifestPath, (line) => stdout(`${line}\n`));
    });

  build
    .command("all")
    .description("Build the PDF, the EPUB and the web edition, then write the QA report.")
    .requiredOption("--config <path>", "book config")
    .option("--out <dir>", "output directory (default dist/<config name>/)")
    .option("--printed", "build and check the printed edition's PDF")
    .action(async (options: { config: string; out?: string; printed?: boolean }) => {
      await runAll(options, deps.manifestPath, (line) => stdout(`${line}\n`));
    });

  build
    .command("web")
    .description("Build the static web edition of the published chapters.")
    .requiredOption("--config <path>", "book config")
    .option("--out <dir>", "output directory (default dist/<config name>/)")
    .action(async (options: { config: string; out?: string }) => {
      stdout(`${webWrittenLine(await runWeb(options, deps.manifestPath))}\n`);
    });

  program
    .command("serve")
    .description("Build the web edition and preview it at http://127.0.0.1:<port>/.")
    .requiredOption("--config <path>", "book config")
    .option("--out <dir>", "output directory (default dist/<config name>/)")
    .option("--port <n>", "port on 127.0.0.1", "8000")
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
    .allowUnknownOption()
    .allowExcessArguments()
    .action(() => {
      throw new BookError("cover", "not available yet");
    });

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
