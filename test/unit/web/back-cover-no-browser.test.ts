import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { writeBackCover } from "../../../src/web/back-cover.ts";
import { loadManifest } from "../../../src/fonts/manifest.ts";
import { BookError } from "../../../src/errors.ts";
import { testConfig } from "../../helpers/config.ts";
import { FIXTURE_FONTS, FIXTURE_MANIFEST } from "../../helpers/fonts.ts";
import { tempDir } from "../../helpers/temp.ts";

vi.mock("playwright", () => ({
  chromium: {
    launch: () => Promise.reject(new Error("browserType.launch: Executable doesn't exist")),
  },
}));

describe("writeBackCover without a browser", () => {
  it("explains how to install Chromium and writes nothing", async () => {
    const set = (await loadManifest(FIXTURE_MANIFEST)).sets["my-sans"];
    const out = tempDir();
    const facts = { ratio: 0.7, edge: [1, 2, 3] as [number, number, number], width: 7, height: 10 };
    const error: unknown = await writeBackCover(
      testConfig(tempDir()),
      out,
      facts,
      set,
      FIXTURE_FONTS,
    ).catch((e: unknown) => e);
    expect(error).toEqual(
      new BookError(
        "back cover",
        "Chromium is not installed; run: npx playwright install chromium",
      ),
    );
    expect(existsSync(join(out, "back-cover.png"))).toBe(false);
  });
});
