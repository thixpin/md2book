import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { configFontSet, fontSetById, loadManifest } from "../../../src/fonts/manifest.ts";
import { BookError } from "../../../src/errors.ts";
import { FIXTURE_MANIFEST } from "../../helpers/fonts.ts";
import { tempDir } from "../../helpers/temp.ts";

const ROLES = [
  "body-regular",
  "body-semibold",
  "body-bold",
  "body-italic",
  "body-bolditalic",
  "mono-regular",
  "mono-bold",
];

interface RawManifest {
  sets: Record<string, { faces: { sha256: string }[] }>;
}

function brokenManifest(change: (m: RawManifest) => unknown): string {
  const manifest = JSON.parse(readFileSync(FIXTURE_MANIFEST, "utf8")) as RawManifest;
  change(manifest);
  const path = join(tempDir(), "fonts-manifest.json");
  writeFileSync(path, JSON.stringify(manifest));
  return path;
}

describe("font manifest (fixture)", () => {
  it("has exactly the four curated sets, each with seven roles and a licence", async () => {
    const manifest = await loadManifest(FIXTURE_MANIFEST);
    expect(Object.keys(manifest.sets).sort()).toEqual([
      "en-sans",
      "en-serif",
      "my-sans",
      "my-serif",
    ]);
    for (const set of Object.values(manifest.sets)) {
      expect(set.faces.map((f) => f.role)).toEqual(ROLES);
      expect(set.licence.file).toBe("LICENSE-OFL.txt");
      for (const entry of [...set.faces, set.licence])
        expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("looks a set up by id and by a config's resolved family", async () => {
    const manifest = await loadManifest(FIXTURE_MANIFEST);
    expect(configFontSet(manifest, { font: { setId: "en-serif" } }).id).toBe("en-serif");
    expect(fontSetById(manifest, "my-sans").body_family).toBe("Noto Sans Myanmar");
  });

  it("rejects an unknown set, listing the valid sets", async () => {
    const manifest = await loadManifest(FIXTURE_MANIFEST);
    expect(() => fontSetById(manifest, "xx-sans")).toThrow(
      new BookError(
        "xx-sans",
        "unknown font set; valid sets: my-sans, my-serif, en-sans, en-serif",
      ),
    );
  });

  it.each([
    ["a missing set", (m: RawManifest) => delete m.sets["en-serif"]],
    ["a missing role", (m: RawManifest) => m.sets["my-sans"]!.faces.pop()],
    ["a bad hash", (m: RawManifest) => (m.sets["my-sans"]!.faces[0]!.sha256 = "xyz")],
  ])("fails validation for %s", async (_case, change) => {
    const error: unknown = await loadManifest(brokenManifest(change)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BookError);
  });
});
