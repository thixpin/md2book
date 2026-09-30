import type { FontStyle, Language } from "./language.ts";

// Fixed presets (spec 006): no custom page dimensions or font sizes.

export interface PageSize {
  /** Millimetres. */
  width: number;
  height: number;
  /** PDF file-name suffix. */
  suffix: string;
  label: string;
}

export const PAGE_SIZES = {
  default: { width: 170, height: 240, suffix: "170x240", label: "Default (170 × 240 mm)" },
  a5: { width: 148, height: 210, suffix: "148x210", label: "A5 (148 × 210 mm)" },
  b5: { width: 176, height: 250, suffix: "176x250", label: "B5 (176 × 250 mm)" },
  a4: { width: 210, height: 297, suffix: "210x297", label: "A4 (210 × 297 mm)" },
  letter: { width: 215.9, height: 279.4, suffix: "216x279", label: "Letter (216 × 279 mm)" },
} as const satisfies Record<string, PageSize>;

export type PageSizeId = keyof typeof PAGE_SIZES;
export const PAGE_SIZE_IDS = Object.keys(PAGE_SIZES) as PageSizeId[];

/**
 * Margins (mm) of a page, proportional to the 170 × 240 mm reference (research R-01): top 20,
 * bottom 22, inside 24, outside 18, so the text block keeps its 128 : 170 width ratio. `sy`
 * scales the fixed vertical offsets of the front matter and chapter openings.
 */
export function pageLayout(page: Pick<PageSize, "width" | "height">) {
  const sx = page.width / 170;
  const sy = page.height / 240;
  return {
    top: 20 * sy,
    bottom: 22 * sy,
    inside: 24 * sx,
    outside: 18 * sx,
    textWidth: 128 * sx,
    sy,
  };
}

/** The web reader's text-size steps around 1 (assets/web-reader.js), so both editions agree. */
export const FONT_SIZES = {
  xs: { factor: 0.85, label: "Extra Small" },
  s: { factor: 0.92, label: "Small" },
  m: { factor: 1, label: "Medium (default)" },
  l: { factor: 1.1, label: "Large" },
  xl: { factor: 1.2, label: "Extra Large" },
} as const;

export type FontSizeId = keyof typeof FONT_SIZES;
export const FONT_SIZE_IDS = Object.keys(FONT_SIZES) as FontSizeId[];

export interface FontFamily {
  id: string;
  /** Font set in the manifest. */
  setId: string;
  language: Language;
  name: string;
  /** Offered by the init wizard; the language's default comes first. */
  wizard: boolean;
  /** The legacy `font_set` value that selects this family, if any. */
  style?: FontStyle;
}

const FAMILY_LIST: FontFamily[] = [
  {
    id: "noto-sans-myanmar",
    setId: "my-sans",
    language: "my",
    name: "Noto Sans Myanmar",
    wizard: true,
    style: "sans",
  },
  {
    id: "noto-serif-myanmar",
    setId: "my-serif",
    language: "my",
    name: "Noto Serif Myanmar",
    wizard: false,
    style: "serif",
  },
  {
    id: "noto-sans",
    setId: "en-sans",
    language: "en",
    name: "Noto Sans",
    wizard: true,
    style: "sans",
  },
  {
    id: "noto-serif",
    setId: "en-serif",
    language: "en",
    name: "Noto Serif",
    wizard: true,
    style: "serif",
  },
];

export const FONT_FAMILIES: Record<string, FontFamily> = Object.fromEntries(
  FAMILY_LIST.map((family) => [family.id, family]),
);

export function fontFamily(id: string): FontFamily | undefined {
  return FONT_FAMILIES[id];
}

/** The family a legacy `font_set` value selects for a language. */
export function familyForStyle(language: Language, style: FontStyle): FontFamily {
  return FAMILY_LIST.find((f) => f.language === language && f.style === style)!;
}

/** The families the wizard offers for a language, default first. */
export function familiesFor(language: Language): FontFamily[] {
  return FAMILY_LIST.filter((f) => f.language === language && f.wizard);
}
