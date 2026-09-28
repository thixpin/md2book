import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  FONT_STYLES,
  LANGUAGES,
  fontSetId,
  type FontSetId,
  type FontStyle,
  type Language,
} from "../config/language.ts";
import { BookError } from "../errors.ts";

/** The only manifest production code trusts (contracts/font-manifest.md). */
export const SHIPPED_MANIFEST = fileURLToPath(
  new URL("../../assets/fonts-manifest.json", import.meta.url),
);

export const FONT_SET_IDS: FontSetId[] = LANGUAGES.flatMap((l) =>
  FONT_STYLES.map((s) => fontSetId(l, s)),
);
const ROLES = [
  "body-regular",
  "body-semibold",
  "body-bold",
  "body-italic",
  "body-bolditalic",
  "mono-regular",
  "mono-bold",
] as const;

const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const faceSchema = z.object({
  role: z.enum(ROLES),
  file: z.string().min(1),
  weight: z.number(),
  italic: z.boolean(),
  sha256,
});
const setSchema = z.object({
  language: z.enum(LANGUAGES),
  style: z.enum(FONT_STYLES),
  body_family: z.string().min(1),
  mono_family: z.string().min(1),
  faces: z
    .array(faceSchema)
    .refine((faces) => ROLES.every((role, i) => faces[i]?.role === role) && faces.length === 7, {
      message: `faces must be the seven roles ${ROLES.join(", ")}`,
    }),
  licence: z.object({ file: z.string().min(1), sha256 }),
});
const manifestSchema = z.object({
  version: z.literal(1),
  release: z.string(),
  base_url: z.string(),
  sets: z.object(Object.fromEntries(FONT_SET_IDS.map((id) => [id, setSchema]))).strict(),
});

export type FontFace = z.infer<typeof faceSchema>;
export type FontSet = z.infer<typeof setSchema> & { id: FontSetId };
export interface FontManifest {
  version: 1;
  release: string;
  base_url: string;
  sets: Record<FontSetId, FontSet>;
}

/**
 * Loads the shipped manifest. `manifestPath` is an internal, test-only override; it is not a
 * CLI flag or environment variable, and manifests are never read from a download source.
 */
export async function loadManifest(manifestPath = SHIPPED_MANIFEST): Promise<FontManifest> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    throw new BookError(manifestPath, "font manifest missing or not valid JSON");
  }
  const parsed = manifestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    throw new BookError(
      manifestPath,
      `invalid font manifest: ${issue.path.join(".")}: ${issue.message}`,
    );
  }
  const sets = Object.fromEntries(
    Object.entries(parsed.data.sets).map(([id, set]) => [id, { ...set, id: id as FontSetId }]),
  ) as Record<FontSetId, FontSet>;
  return { ...parsed.data, sets };
}

export function getFontSet(manifest: FontManifest, language: Language, style: FontStyle): FontSet {
  return manifest.sets[fontSetId(language, style)];
}

export function fontSetById(manifest: FontManifest, id: string): FontSet {
  const set = (manifest.sets as Record<string, FontSet | undefined>)[id];
  if (!set) throw new BookError(id, `unknown font set; valid sets: ${FONT_SET_IDS.join(", ")}`);
  return set;
}

/** Faces plus licence, each file once. */
export function setFiles(set: FontSet): { file: string; sha256: string }[] {
  const all = [...set.faces, set.licence];
  return all.filter((entry, i) => all.findIndex((e) => e.file === entry.file) === i);
}
