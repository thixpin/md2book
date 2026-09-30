import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { FONT_STYLES, LANGUAGES, fontSetId, type FontSetId } from "../config/language.ts";
import { BookError } from "../errors.ts";

/** The only manifest production code trusts (contracts/font-manifest.md). */
export const SHIPPED_MANIFEST = fileURLToPath(
  new URL("../../assets/fonts-manifest.json", import.meta.url),
);

const NOTO_SET_IDS = LANGUAGES.flatMap((l) => FONT_STYLES.map((s) => fontSetId(l, s)));
/** Spec 006: Myanmar families shipped unmodified (Padauk) or merged with Noto Sans Latin. */
const NEW_SET_IDS = ["my-padauk", "my-masterpiece"] as const;
export const FONT_SET_IDS: FontSetId[] = [...NOTO_SET_IDS, ...NEW_SET_IDS];
const ROLES = [
  "body-regular",
  "body-semibold",
  "body-bold",
  "body-italic",
  "body-bolditalic",
  "mono-regular",
  "mono-bold",
] as const;

const REQUIRED_ROLES: readonly (typeof ROLES)[number][] = [
  "body-regular",
  "mono-regular",
  "mono-bold",
];

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
  style: z.enum(FONT_STYLES).optional(),
  body_family: z.string().min(1),
  mono_family: z.string().min(1),
  // In role order; semibold, bold and italic faces may be absent (the renderer synthesises them).
  faces: z.array(faceSchema).refine(
    (faces) => {
      const roles = faces.map((face) => face.role);
      return (
        REQUIRED_ROLES.every((role) => roles.includes(role)) &&
        roles.every((role, i) => i === 0 || ROLES.indexOf(role) > ROLES.indexOf(roles[i - 1]!))
      );
    },
    {
      message: `faces must include ${REQUIRED_ROLES.join(", ")}, in the order ${ROLES.join(", ")}`,
    },
  ),
  licence: z.object({ file: z.string().min(1), sha256 }),
});
const manifestSchema = z.object({
  version: z.literal(1),
  release: z.string(),
  base_url: z.string(),
  sets: z
    .object({
      ...Object.fromEntries(NOTO_SET_IDS.map((id) => [id, setSchema])),
      ...Object.fromEntries(NEW_SET_IDS.map((id) => [id, setSchema.optional()])),
    })
    .strict(),
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
    Object.entries(parsed.data.sets)
      .filter(([, set]) => set !== undefined)
      .map(([id, set]) => [id, { ...set, id: id as FontSetId }]),
  ) as Record<FontSetId, FontSet>;
  return { ...parsed.data, sets };
}

/** The set of the config's resolved font family (spec 006). */
export function configFontSet(
  manifest: FontManifest,
  config: { font: { setId: string } },
): FontSet {
  return fontSetById(manifest, config.font.setId);
}

export function fontSetById(manifest: FontManifest, id: string): FontSet {
  const set = (manifest.sets as Record<string, FontSet | undefined>)[id];
  if (!set) throw new BookError(id, `unknown font set; valid sets: ${FONT_SET_IDS.join(", ")}`);
  return set;
}

/** A face's file, or the regular body face when the set has no such face. */
export function faceFile(set: FontSet, role: FontFace["role"]): string {
  const face =
    set.faces.find((f) => f.role === role) ?? set.faces.find((f) => f.role === "body-regular")!;
  return face.file;
}

/** Faces plus licence, each file once. */
export function setFiles(set: FontSet): { file: string; sha256: string }[] {
  const all = [...set.faces, set.licence];
  return all.filter((entry, i) => all.findIndex((e) => e.file === entry.file) === i);
}
