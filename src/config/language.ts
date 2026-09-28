export const LANGUAGES = ["my", "en"] as const;
export const FONT_STYLES = ["sans", "serif"] as const;

export type Language = (typeof LANGUAGES)[number];
export type FontStyle = (typeof FONT_STYLES)[number];
export type FontSetId = `${Language}-${FontStyle}`;

export interface SeriesStrings {
  chapter_label: string;
  chapter_digits: "myanmar" | "ascii";
  contents_heading: string;
  page_names: { cover: string; contents: string; back_cover: string };
  callout_titles: { note: string; warning: string; try: string };
  licence_text: string;
  typeface_line: string;
  storage_prefix: string;
}

/** Body family of each curated font set; supplies the `typeface_line` default. */
export const FONT_FAMILIES: Record<FontSetId, string> = {
  "my-sans": "Noto Sans Myanmar",
  "my-serif": "Noto Serif Myanmar",
  "en-sans": "Noto Sans",
  "en-serif": "Noto Serif",
};

const CC_LICENCE =
  "This work is licensed under the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 " +
  "International License (CC BY-NC-ND 4.0). https://creativecommons.org/licenses/by-nc-nd/4.0/";

const PROFILES: Record<
  Language,
  Pick<SeriesStrings, "chapter_label" | "chapter_digits" | "contents_heading">
> = {
  my: { chapter_label: "အခန်း", chapter_digits: "myanmar", contents_heading: "မာတိကာ" },
  en: { chapter_label: "Chapter", chapter_digits: "ascii", contents_heading: "Contents" },
};

export function fontSetId(language: Language, style: FontStyle): FontSetId {
  return `${language}-${style}`;
}

export function defaultStrings(language: Language, style: FontStyle): SeriesStrings {
  return {
    ...PROFILES[language],
    page_names: { cover: "Cover", contents: "Contents", back_cover: "Back cover" },
    callout_titles: { note: "Note", warning: "Warning", try: "Try it yourself" },
    licence_text: CC_LICENCE,
    typeface_line: `Typeface: ${FONT_FAMILIES[fontSetId(language, style)]}`,
    storage_prefix: "devbook",
  };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * First-line chapter heading. `my`: `# အခန်း (၁) - Title`; `en`: `# Chapter 3 - Title`.
 * Group 1 is the label, group 2 the title. Both accept Myanmar and ASCII digits.
 */
export function chapterHeadingPattern(language: Language, label: string): RegExp {
  const word = escapeRegExp(label);
  const number = language === "my" ? String.raw`\s*\([၀-၉0-9]+\)` : String.raw`\s+[၀-၉0-9]+`;
  return new RegExp(String.raw`^#\s+(${word}${number})\s*-\s*(.+?)\s*$`, "u");
}

const MYANMAR_ZERO = 0x1040;

export function parseDigits(text: string): number {
  const ascii = text.replace(/[၀-၉]/gu, (d) => String(d.codePointAt(0)! - MYANMAR_ZERO));
  return Number.parseInt(ascii, 10);
}

export function formatDigits(value: number, digits: SeriesStrings["chapter_digits"]): string {
  const ascii = String(value);
  if (digits === "ascii") return ascii;
  return ascii.replace(/[0-9]/g, (d) => String.fromCodePoint(MYANMAR_ZERO + Number(d)));
}
