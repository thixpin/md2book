import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { BookError, warn } from "../errors.ts";
import { findCodeRoot } from "./code-root.ts";
import { defaultStrings, type SeriesStrings } from "./language.ts";
import {
  FONT_SIZES,
  PAGE_SIZES,
  defaultLayout,
  familyForStyle,
  fontFamily,
  type FontFamily,
  type FontSizeId,
  type PageSize,
  type PageSizeId,
  type Layout,
} from "./presets.ts";
import { bookConfigSchema, type RawBookConfig } from "./schema.ts";

export type BookConfig = Omit<
  RawBookConfig,
  "strings" | "code_root" | "page" | "font" | "running" | keyof typeof RENAMED
> & {
  configPath: string;
  configDir: string;
  code_root: string;
  strings: SeriesStrings;
  page: PageSize & { id: PageSizeId };
  /** Running heads and feet of the PDF and the web edition, defaults filled in. */
  running: Layout;
  font: {
    family: string;
    setId: string;
    size: (typeof FONT_SIZES)[FontSizeId] & { id: FontSizeId };
  };
};

export interface LoadedConfig {
  config: BookConfig;
  warnings: string[];
  placeholders: { key: string; value: string }[];
}

// Deprecated names (removed before 1.0), still read with a warning.
const RENAMED = {
  description: "web_description",
  favicon: "web_favicon",
  back_cover: "web_back_cover",
} as const;

const PATH_KEYS = [
  "cover",
  "web_back_cover",
  "web_favicon",
  "chapter_glob",
  "part_glob",
  "end_image",
] as const;

/**
 * Loads and validates a book config. `requireCover: false` skips the cover-file check, for the
 * `cover` command, which creates that file.
 */
export async function loadConfig(
  configPath: string,
  options: { requireCover?: boolean } = {},
): Promise<LoadedConfig> {
  const path = resolve(configPath);
  const raw = await readJson(path);
  const parsed = bookConfigSchema.safeParse(raw);
  if (!parsed.success) throw new BookError(path, describeIssue(parsed.error.issues[0]!));

  const warnings = unknownKeys(raw, bookConfigSchema).map((key) => `unknown key: ${key}`);
  warnings.forEach(warn);

  const configDir = dirname(path);
  const { strings, code_root, page, font, running, description, favicon, back_cover, ...fields } =
    parsed.data;
  const family = resolveFamily(path, fields, font?.family, hasKey(raw, "font_set"));
  const deprecated = deprecations(raw, family.id, fields.running_headers);
  deprecated.forEach(warn);
  warnings.push(...deprecated);
  for (const [old, current] of Object.entries(RENAMED)) {
    if (hasKey(raw, old) && hasKey(raw, current)) {
      throw new BookError(path, `${old} is the old name of ${current}; keep only ${current}`);
    }
  }
  const pageId = page?.size ?? "default";
  const sizeId = font?.size ?? "m";
  const config: BookConfig = {
    ...fields,
    web_description: fields.web_description ?? description,
    web_favicon: fields.web_favicon ?? favicon,
    web_back_cover: fields.web_back_cover ?? back_cover,
    publisher: fields.publisher || undefined,
    isbn: fields.isbn || undefined,
    configPath: path,
    configDir,
    code_root: code_root ? resolve(configDir, code_root) : findCodeRoot(configDir),
    strings: mergeStrings(
      {
        ...defaultStrings(fields.language, fields.font_set),
        typeface_line: `Typeface: ${family.name}`,
      },
      strings,
    ),
    page: { id: pageId, ...PAGE_SIZES[pageId] },
    running: {
      top: { ...defaultLayout.top, ...running?.top },
      bottom: { ...defaultLayout.bottom, ...running?.bottom },
    },
    font: { family: family.id, setId: family.setId, size: { id: sizeId, ...FONT_SIZES[sizeId] } },
  };
  for (const key of PATH_KEYS) {
    const value = config[key];
    if (value) config[key] = resolve(configDir, value);
  }
  if (options.requireCover !== false && !existsSync(config.cover)) {
    throw new BookError(path, `cover not found: ${config.cover}`);
  }

  return { config, warnings, placeholders: findPlaceholders(parsed.data) };
}

/** One warning per deprecated key the file sets, naming what replaces it. */
function deprecations(raw: unknown, familyId: string, runningHeaders: boolean): string[] {
  const found: string[] = [];
  for (const [old, current] of Object.entries(RENAMED)) {
    if (hasKey(raw, old)) found.push(`${old} is deprecated; rename it ${current}`);
  }
  if (hasKey(raw, "font_set")) {
    found.push(`font_set is deprecated; use "font": { "family": "${familyId}" }`);
  }
  if (hasKey(raw, "running_headers")) {
    found.push(
      runningHeaders
        ? "running_headers is deprecated; remove it (the running heads are on by default)"
        : 'running_headers is deprecated; set "running": { "top": { "inner": "none", "outer": "none" } }',
    );
  }
  return found;
}

function hasKey(raw: unknown, key: string): boolean {
  return !!raw && typeof raw === "object" && key in raw;
}

/** `font.family`, else the legacy `font_set`, else the language's default (spec 006 FR-015). */
function resolveFamily(
  path: string,
  fields: Pick<RawBookConfig, "language" | "font_set">,
  familyId: string | undefined,
  explicitSet: boolean,
): FontFamily {
  const fromSet = familyForStyle(fields.language, fields.font_set);
  if (familyId === undefined) return fromSet;
  const family = fontFamily(familyId)!;
  if (family.language !== fields.language) {
    const own = [familyForStyle(fields.language, "sans"), familyForStyle(fields.language, "serif")];
    const kind = family.language === "my" ? "a Myanmar" : "an English";
    const books = fields.language === "my" ? "Myanmar" : "English";
    throw new BookError(
      path,
      `font.family: ${family.id} is ${kind} family; ${books} books use ${own.map((f) => f.id).join(" or ")}`,
    );
  }
  if (explicitSet && fromSet.id !== family.id) {
    throw new BookError(
      path,
      `font_set: ${fields.font_set} selects ${fromSet.id}, but font.family is ${family.id}; remove font_set`,
    );
  }
  return family;
}

async function readJson(path: string): Promise<unknown> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    throw new BookError(path, "cannot read config file");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new BookError(path, `invalid JSON: ${(error as Error).message}`);
  }
}

function describeIssue(issue: z.core.$ZodIssue): string {
  const key = issue.path.join(".");
  if (issue.code === "invalid_value") return `${key}: must be one of ${issue.values.join(", ")}`;
  // An unknown choice in a discriminated union (web_analytics.provider).
  if (issue.code === "invalid_union" && "options" in issue && Array.isArray(issue.options))
    return `${key}: must be one of ${issue.options.join(", ")}`;
  if (issue.code === "invalid_type" && issue.input === undefined)
    return `${key}: required key missing`;
  return `${key}: ${issue.message}`;
}

/** Key paths present in `value` but not described by `schema` (objects only, any depth). */
function unknownKeys(value: unknown, schema: z.ZodType, prefix = ""): string[] {
  const shape = objectShape(schema);
  if (!shape || !value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix + key;
    const childSchema = shape[key];
    return childSchema ? unknownKeys(child, childSchema, `${path}.`) : [path];
  });
}

function objectShape(schema: z.ZodType): Record<string, z.ZodType> | undefined {
  let current = schema;
  // Unwrap optional/default wrappers down to the object schema, if any.
  while (current instanceof z.ZodOptional || current instanceof z.ZodDefault) {
    current = current.unwrap() as z.ZodType;
  }
  return current instanceof z.ZodObject ? current.shape : undefined;
}

function mergeStrings(
  defaults: SeriesStrings,
  explicit: RawBookConfig["strings"] = {},
): SeriesStrings {
  return {
    ...defaults,
    ...explicit,
    page_names: { ...defaults.page_names, ...explicit.page_names },
    callout_titles: { ...defaults.callout_titles, ...explicit.callout_titles },
  };
}

function findPlaceholders(value: unknown, prefix = ""): { key: string; value: string }[] {
  if (typeof value === "string") {
    return value.includes("PLACEHOLDER") ? [{ key: prefix.slice(0, -1), value }] : [];
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) =>
    findPlaceholders(child, `${prefix}${key}.`),
  );
}
