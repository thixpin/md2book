import { z } from "zod";
import { FONT_STYLES, LANGUAGES } from "./language.ts";
import { FONT_FAMILIES, FONT_SIZE_IDS, PAGE_SIZE_IDS, slotValues } from "./presets.ts";

// Mirrors specs/001-core-manuscript-pipeline/contracts/book-config.schema.json (the
// compatibility surface); test/unit/config/schema.test.ts keeps the two in step.

const nonEmpty = z.string().min(1);

const stringsSchema = z
  .object({
    chapter_label: nonEmpty,
    chapter_digits: z.enum(["myanmar", "ascii"]),
    contents_heading: z.string(),
    page_names: z
      .object({ cover: z.string(), contents: z.string(), back_cover: z.string() })
      .partial(),
    callout_titles: z.object({ note: z.string(), warning: z.string(), try: z.string() }).partial(),
    licence_text: z.string(),
    typeface_line: z.string(),
    storage_prefix: nonEmpty,
  })
  .partial();

export const bookConfigSchema = z.object({
  title: nonEmpty,
  subtitle: z.string().optional(),
  author: nonEmpty,
  publisher: z.string().optional(),
  year: z.string(),
  isbn: z.string().optional(),
  language: z.enum(LANGUAGES).default("my"),
  identifier: nonEmpty,
  output_name: nonEmpty,
  cover: nonEmpty,
  back_cover: z.string().optional(),
  favicon: z.string().optional(),
  web_url: z.string().optional(),
  description: z.string().optional(),
  chapter_glob: nonEmpty,
  part_glob: z.string().optional(),
  web_published_chapters: z.array(z.string()).optional(),
  recto_chapter_start: z.boolean().default(false),
  running_headers: z.boolean().default(true),
  end_image: z.string().optional(),
  end_image_after: z.string().optional(),
  font_set: z.enum(FONT_STYLES).default("sans"),
  page: z
    .object({ size: z.enum(PAGE_SIZE_IDS) })
    .partial()
    .optional(),
  font: z
    .object({
      family: z.enum(Object.keys(FONT_FAMILIES) as [string, ...string[]]),
      size: z.enum(FONT_SIZE_IDS),
    })
    .partial()
    .optional(),
  running: z
    .object({
      top: z
        .object({
          inner: z.enum(slotValues),
          center: z.enum(slotValues),
          outer: z.enum(slotValues),
        })
        .partial(),
      bottom: z
        .object({
          inner: z.enum(slotValues),
          center: z.enum(slotValues),
          outer: z.enum(slotValues),
        })
        .partial(),
    })
    .partial()
    .optional(),
  code_root: z.string().optional(),
  strings: stringsSchema.optional(),
});

export type RawBookConfig = z.infer<typeof bookConfigSchema>;
