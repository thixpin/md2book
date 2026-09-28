import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { writeBackCover } from "../../../src/web/back-cover.ts";
import { loadManifest } from "../../../src/fonts/manifest.ts";
import { BookError } from "../../../src/errors.ts";
import { testConfig } from "../../helpers/config.ts";
import { FIXTURE_FONTS, FIXTURE_MANIFEST } from "../../helpers/fonts.ts";
import { PNG_1X1, tempDir } from "../../helpers/temp.ts";

const facts = {
  ratio: 0.7,
  edge: [10, 60, 110] as [number, number, number],
  width: 700,
  height: 1000,
};

async function mySans() {
  return (await loadManifest(FIXTURE_MANIFEST)).sets["my-sans"];
}

describe("writeBackCover", () => {
  it("copies a configured back cover", async () => {
    const dir = tempDir({ "back.jpg": PNG_1X1 });
    const out = tempDir();
    const config = testConfig(dir, { back_cover: join(dir, "back.jpg") });
    expect(await writeBackCover(config, out, facts, await mySans(), FIXTURE_FONTS)).toBe(
      "back-cover.jpg",
    );
    expect(readFileSync(join(out, "back-cover.jpg"))).toEqual(PNG_1X1);
  });

  it("stops when a configured back cover is missing", async () => {
    const dir = tempDir();
    const config = testConfig(dir, { back_cover: join(dir, "nope.png") });
    const error: unknown = await writeBackCover(
      config,
      tempDir(),
      facts,
      await mySans(),
      FIXTURE_FONTS,
    ).catch((e: unknown) => e);
    expect(error).toEqual(new BookError(join(dir, "nope.png"), "back_cover not found"));
  });

  it(
    "generates a plain back cover in the edge colour with the title and author",
    { timeout: 60_000 },
    async () => {
      const out = tempDir();
      const config = testConfig(tempDir(), { title: "ကခ Title", author: "Author" });
      expect(await writeBackCover(config, out, facts, await mySans(), FIXTURE_FONTS)).toBe(
        "back-cover.png",
      );
      const image = sharp(join(out, "back-cover.png"));
      const meta = await image.metadata();
      expect([meta.width, meta.height]).toEqual([850, Math.round(850 / 0.7)]);
      const { data } = await image.raw().toBuffer({ resolveWithObject: true });
      expect([...data.subarray(0, 3)]).toEqual([10, 60, 110]);
    },
  );
});
