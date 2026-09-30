import type { Language } from "../config/language.ts";
import {
  FONT_SIZES,
  PAGE_SIZES,
  familiesFor,
  type FontSizeId,
  type PageSizeId,
} from "../config/presets.ts";
import { normalizeLanguage } from "./options.ts";
import { openTerminal } from "./select.ts";

export interface InitAnswers {
  lang?: string;
  /** Legacy `sans`/`serif`. */
  font?: string;
  fontFamily?: string;
  pageSize?: string;
  fontSize?: string;
  chapters?: string;
  title?: string;
  author?: string;
}

const CUSTOM = Symbol("custom");
/** Wizard order: Medium first, then from the smallest up (spec 006). */
const SIZE_ORDER: FontSizeId[] = ["m", "xs", "s", "l", "xl"];

/**
 * Asks for what the flags left out (spec 006 FR-016–FR-018): first how to configure the book,
 * then language, title and author; the wizard adds page size, font family, font size and the
 * chapter folder. Lists for presets; text only for title, author and a custom folder.
 */
export async function promptMissing(
  given: InitAnswers,
  io: { input: NodeJS.ReadableStream; output: NodeJS.WritableStream },
): Promise<InitAnswers & { lang: string; title: string; author: string }> {
  const term = openTerminal(io);
  try {
    const wizard =
      (await term.select("How would you like to configure your book?", [
        { label: "Use default configuration", value: false },
        { label: "Configure with wizard", value: true },
      ])) === true;
    const lang =
      given.lang ??
      (await term.select<string>("Language", [
        { label: "Myanmar", value: "my" },
        { label: "English", value: "en" },
      ]));
    const title = given.title ?? (await term.text("Title"));
    const author = given.author ?? (await term.text("Author"));
    const answers: InitAnswers & { lang: string; title: string; author: string } = {
      ...given,
      lang,
      title,
      author,
    };
    if (!wizard) return answers;

    const language: Language = normalizeLanguage(lang);
    answers.pageSize ??= await term.select<string>(
      "Page size",
      (Object.keys(PAGE_SIZES) as PageSizeId[]).map((id) => ({
        label: PAGE_SIZES[id].label,
        value: id,
      })),
    );
    if (given.fontFamily === undefined && given.font === undefined) {
      answers.fontFamily = await term.select(
        "Font family",
        familiesFor(language).map((family, i) => ({
          label: i === 0 ? `${family.name} (default)` : family.name,
          value: family.id,
        })),
      );
    }
    answers.fontSize ??= await term.select<string>(
      "Font size",
      SIZE_ORDER.map((id) => ({ label: FONT_SIZES[id].label, value: id })),
    );
    if (given.chapters === undefined) {
      const folder = await term.select<string | typeof CUSTOM>("Chapter folder", [
        { label: "Default (chapters)", value: "chapters" },
        { label: "Custom", value: CUSTOM },
      ]);
      answers.chapters = folder === CUSTOM ? await term.text("Chapter folder") : folder;
    }
    return answers;
  } finally {
    term.close();
  }
}
