import { createInterface } from "node:readline/promises";

export interface InitAnswers {
  lang?: string;
  font?: string;
  title?: string;
  author?: string;
}

/** Asks for each missing value in order: language, font set (default sans), title, author. */
export async function promptMissing(
  given: InitAnswers,
  io: { input: NodeJS.ReadableStream; output: NodeJS.WritableStream },
): Promise<Required<InitAnswers>> {
  const rl = createInterface({ input: io.input, output: io.output });
  try {
    const lang = given.lang ?? (await rl.question("Language (my/en): "));
    const font = given.font ?? ((await rl.question("Font set (sans/serif) [sans]: ")) || "sans");
    const title = given.title ?? (await rl.question("Title: "));
    const author = given.author ?? (await rl.question("Author: "));
    return { lang, font, title, author };
  } finally {
    rl.close();
  }
}
