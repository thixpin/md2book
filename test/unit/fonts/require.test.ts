import { rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFontSet } from "../../../src/fonts/fetch.ts";
import { loadManifest } from "../../../src/fonts/manifest.ts";
import { requireFontSet } from "../../../src/fonts/require.ts";
import { BookError } from "../../../src/errors.ts";
import { testConfig } from "../../helpers/config.ts";
import { FIXTURE_FONTS, FIXTURE_MANIFEST } from "../../helpers/fonts.ts";
import { tempDir } from "../../helpers/temp.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireFontSet", () => {
  it("returns the set directory when every file is present", async () => {
    vi.stubEnv("MD2BOOK_FONTS_SOURCE", FIXTURE_FONTS);
    const root = tempDir();
    const manifest = await loadManifest(FIXTURE_MANIFEST);
    await fetchFontSet(manifest.sets["my-sans"], { fontsDir: root, manifest });
    const config = testConfig(tempDir());
    const { dir, set } = await requireFontSet(config, {
      fontsDir: root,
      manifestPath: FIXTURE_MANIFEST,
    });
    expect(dir).toBe(join(root, "my-sans"));
    expect(set.id).toBe("my-sans");
  });

  it("stops with the fix command when a face is missing", async () => {
    vi.stubEnv("MD2BOOK_FONTS_SOURCE", FIXTURE_FONTS);
    const root = tempDir();
    const manifest = await loadManifest(FIXTURE_MANIFEST);
    await fetchFontSet(manifest.sets["my-sans"], { fontsDir: root, manifest });
    rmSync(join(root, "my-sans", "NotoSansMono-Bold.ttf"));
    const config = testConfig(tempDir());

    const error: unknown = await requireFontSet(config, {
      fontsDir: root,
      manifestPath: FIXTURE_MANIFEST,
    }).catch((e: unknown) => e);
    expect(error).toEqual(
      new BookError(
        join(root, "my-sans"),
        `font set my-sans not found; run: book-build fonts --config ${config.configPath}`,
      ),
    );
  });
});
