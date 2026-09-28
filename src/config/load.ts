import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { BookError, warn } from "../errors.ts";
import { findCodeRoot } from "./code-root.ts";
import { defaultStrings, type SeriesStrings } from "./language.ts";
import { bookConfigSchema, type RawBookConfig } from "./schema.ts";

export type BookConfig = Omit<RawBookConfig, "strings" | "code_root"> & {
  configPath: string;
  configDir: string;
  code_root: string;
  strings: SeriesStrings;
};

export interface LoadedConfig {
  config: BookConfig;
  warnings: string[];
  placeholders: { key: string; value: string }[];
}

const PATH_KEYS = [
  "cover",
  "back_cover",
  "favicon",
  "chapter_glob",
  "part_glob",
  "end_image",
] as const;

export async function loadConfig(configPath: string): Promise<LoadedConfig> {
  const path = resolve(configPath);
  const raw = await readJson(path);
  const parsed = bookConfigSchema.safeParse(raw);
  if (!parsed.success) throw new BookError(path, describeIssue(parsed.error.issues[0]!));

  const warnings = unknownKeys(raw, bookConfigSchema).map((key) => `unknown key: ${key}`);
  warnings.forEach(warn);

  const configDir = dirname(path);
  const { strings, code_root, ...fields } = parsed.data;
  const config: BookConfig = {
    ...fields,
    publisher: fields.publisher || undefined,
    isbn: fields.isbn || undefined,
    configPath: path,
    configDir,
    code_root: code_root ? resolve(configDir, code_root) : findCodeRoot(configDir),
    strings: mergeStrings(defaultStrings(fields.language, fields.font_set), strings),
  };
  for (const key of PATH_KEYS) {
    const value = config[key];
    if (value) config[key] = resolve(configDir, value);
  }
  if (!existsSync(config.cover)) throw new BookError(path, `cover not found: ${config.cover}`);

  return { config, warnings, placeholders: findPlaceholders(parsed.data) };
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
