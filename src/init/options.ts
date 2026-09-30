import { isAbsolute, posix } from "node:path";
import type { FontStyle, Language } from "../config/language.ts";
import {
  FONT_FAMILIES,
  FONT_SIZE_IDS,
  PAGE_SIZE_IDS,
  familyForStyle,
  fontFamily,
  type FontFamily,
  type FontSizeId,
  type PageSizeId,
} from "../config/presets.ts";
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

export function normalizePageSize(input: string | undefined): PageSizeId {
  const size = (input ?? "default").trim().toLowerCase();
  if (!(PAGE_SIZE_IDS as string[]).includes(size)) {
    throw new BookError(
      "--page-size",
      `unsupported page size "${input}"; valid values: ${PAGE_SIZE_IDS.join(", ")}`,
    );
  }
  return size as PageSizeId;
}

export function normalizeFontSize(input: string | undefined): FontSizeId {
  const size = (input ?? "m").trim().toLowerCase();
  if (!(FONT_SIZE_IDS as string[]).includes(size)) {
    throw new BookError(
      "--font-size",
      `unsupported font size "${input}"; valid values: ${FONT_SIZE_IDS.join(", ")}`,
    );
  }
  return size as FontSizeId;
}

/** `--font-family`, else the legacy `--font` (sans/serif), else the language's default. */
export function normalizeFontFamily(
  language: Language,
  familyInput: string | undefined,
  fontInput: string | undefined,
): FontFamily {
  const fromFont = familyForStyle(language, normalizeFontStyle(fontInput));
  if (familyInput === undefined) return fromFont;
  const id = familyInput.trim().toLowerCase();
  const family = fontFamily(id);
  if (!family || family.language !== language) {
    const valid = Object.values(FONT_FAMILIES)
      .filter((f) => f.language === language)
      .map((f) => f.id);
    throw new BookError(
      "--font-family",
      `unsupported font family "${familyInput}" for ${language} books; valid values: ${valid.join(", ")}`,
    );
  }
  if (fontInput !== undefined && fromFont.id !== family.id) {
    throw new BookError(
      "--font-family",
      `--font ${normalizeFontStyle(fontInput)} selects ${fromFont.id}; give one of --font and --font-family`,
    );
  }
  return family;
}

/** A relative folder inside the book folder, written with forward slashes (default `chapters`). */
export function normalizeChapters(input: string | undefined): string {
  const folder = posix
    .normalize((input ?? "chapters").trim().replace(/\\/g, "/"))
    .replace(/\/+$/, "");
  if (
    !folder ||
    folder === "." ||
    isAbsolute(folder) ||
    folder === ".." ||
    folder.startsWith("../")
  ) {
    throw new BookError("--chapters", "must be a folder inside the book folder");
  }
  return folder;
}
