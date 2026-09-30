import { randomUUID } from "node:crypto";
import { defaultStrings, formatDigits, type Language } from "../config/language.ts";
import { titleSlug } from "./slug.ts";

export interface InitRequest {
  language: Language;
  fontFamily: string;
  pageSize: string;
  fontSize: string;
  /** Chapter folder, relative to the book folder. */
  chapters: string;
  title: string;
  author: string;
}

export const MIT_LICENCE =
  "This work is licensed under the MIT License. https://opensource.org/license/mit";

/**
 * FR-063: only `strings.licence_text` is written; other strings follow the language defaults.
 * The page and font presets are written explicitly (spec 006 FR-019); `font_set` no longer is.
 */
export function bookJson(request: InitRequest, year = new Date().getFullYear()) {
  return {
    title: request.title,
    author: request.author,
    year: String(year),
    language: request.language,
    identifier: `urn:uuid:${randomUUID()}`,
    output_name: titleSlug(request.title),
    cover: "cover/cover.png",
    chapter_glob: `${request.chapters}/chapter-*.md`,
    page: { size: request.pageSize },
    font: { family: request.fontFamily, size: request.fontSize },
    strings: { licence_text: MIT_LICENCE },
  };
}

const SAMPLE: Record<Language, { title: string; body: string }> = {
  my: {
    title: "ပထမ အခန်း",
    body: "ဤနေရာတွင် စာရေးပါ။\n\n## ပထမ အပိုင်း\n\nစာပိုဒ်တစ်ခု။\n",
  },
  en: {
    title: "Getting Started",
    body: "Write your first chapter here.\n\n## First section\n\nA paragraph.\n",
  },
};

export function sampleChapter(language: Language): string {
  const { chapter_label, chapter_digits } = defaultStrings(language, "sans");
  const one = formatDigits(1, chapter_digits);
  const label = language === "my" ? `${chapter_label} (${one})` : `${chapter_label} ${one}`;
  return `# ${label} - ${SAMPLE[language].title}\n\n${SAMPLE[language].body}`;
}
