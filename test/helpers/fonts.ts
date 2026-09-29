import { fixture } from "./temp.ts";

export const FIXTURE_FONTS = fixture("fonts-source");
export const FIXTURE_MANIFEST = fixture("fonts-source", "fonts-manifest.json");

/** Full-shaping fonts for the PDF tests (scripts/make-font-fixtures.py --print). */
export const PRINT_FONTS = fixture("fonts-print");
export const PRINT_MANIFEST = fixture("fonts-print", "fonts-manifest.json");
