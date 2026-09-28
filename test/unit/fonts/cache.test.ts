import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fontsRoot, setDir } from "../../../src/fonts/cache.ts";
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

describe("fontsRoot", () => {
  it("prefers --fonts, then MD2BOOK_FONTS, then XDG_CACHE_HOME, then ~/.cache", () => {
    vi.stubEnv("MD2BOOK_FONTS", "/env/fonts");
    vi.stubEnv("XDG_CACHE_HOME", "/xdg");
    expect(fontsRoot({ fontsDir: "/flag" })).toBe("/flag");
    expect(fontsRoot({})).toBe("/env/fonts");
    vi.stubEnv("MD2BOOK_FONTS", "");
    expect(fontsRoot({})).toBe("/xdg/md2book/fonts");
    vi.stubEnv("XDG_CACHE_HOME", "");
    expect(fontsRoot({})).toBe(join(homedir(), ".cache", "md2book", "fonts"));
  });

  it("keeps each set in its own directory", () => {
    expect(setDir("/root", "en-sans")).toBe(join("/root", "en-sans"));
  });
});

describe("switching font_set", () => {
  it("leaves the old set cached and requires the new one to be fetched", async () => {
    vi.stubEnv("MD2BOOK_FONTS_SOURCE", FIXTURE_FONTS);
    const root = tempDir();
    const manifest = await loadManifest(FIXTURE_MANIFEST);
    await fetchFontSet(manifest.sets["en-sans"], { fontsDir: root, manifest });
    const before = readdirSync(join(root, "en-sans")).sort();

    const config = testConfig(tempDir(), { language: "en", font_set: "serif" });
    const error: unknown = await requireFontSet(config, {
      fontsDir: root,
      manifestPath: FIXTURE_MANIFEST,
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BookError);
    expect(readdirSync(join(root, "en-sans")).sort()).toEqual(before);
    expect(existsSync(join(root, "en-serif"))).toBe(false);
  });
});
