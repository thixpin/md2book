import type { FontStyle, Language } from "../config/language.ts";
import { BookError } from "../errors.ts";

const LANGUAGE_INPUTS: Record<string, Language> = {
  my: "my",
  mm: "my",
  myanmar: "my",
  en: "en",
  english: "en",
};

/** `mm` is a country code, accepted here only as init input; the config stores `my`. */
export function normalizeLanguage(input: string): Language {
  const language = LANGUAGE_INPUTS[input.trim().toLowerCase()];
  if (!language) {
    throw new BookError(
      "--lang",
      `unsupported language "${input}"; valid values: ${Object.keys(LANGUAGE_INPUTS).join(", ")}`,
    );
  }
  return language;
}

export function normalizeFontStyle(input: string | undefined): FontStyle {
  const style = (input ?? "sans").trim().toLowerCase();
  if (style !== "sans" && style !== "serif") {
    throw new BookError("--font", `unsupported font set "${input}"; valid values: sans, serif`);
  }
  return style;
}
