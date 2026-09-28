import { Command, CommanderError } from "commander";
import { BookError } from "./errors.ts";

export interface CliDeps {
  stdout?: (text: string) => void;
  stderr?: (text: string) => void;
  /** Test-only: font manifest to use instead of the shipped one. Not a flag or env var. */
  manifestPath?: string;
}

const RESERVED = ["pdf", "epub", "qa", "all", "web", "serve", "cover"] as const;

/** Runs `book-build` with user arguments (no node/script prefix); resolves to the exit code. */
export async function runCli(argv: string[], deps: CliDeps = {}): Promise<number> {
  const stdout = deps.stdout ?? ((text: string) => process.stdout.write(text));
  const stderr = deps.stderr ?? ((text: string) => process.stderr.write(text));

  const program = new Command("book-build")
    .description("Build books from Markdown manuscripts.")
    .exitOverride()
    .configureOutput({ writeOut: stdout, writeErr: stderr });

  for (const name of RESERVED) {
    program.command(name).action(() => {
      throw new BookError(name, "not available yet");
    });
  }

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
