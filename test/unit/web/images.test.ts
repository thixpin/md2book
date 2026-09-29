import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { writeFavicons, writeOgImage } from "../../../src/web/images.ts";
import { BookError } from "../../../src/errors.ts";
import { testConfig } from "../../helpers/config.ts";
import { PNG_1X1, fixture, tempDir } from "../../helpers/temp.ts";

// Ports of development-book/publish/test_web.py cases 6–9 (REF §11).
describe("share image", () => {
  it("is a 1200×630 PNG with the cover centred on its edge colour", async () => {
    const out = tempDir();
    const cover = join(tempDir(), "cover.png");
    await sharp({ create: { width: 70, height: 100, channels: 3, background: "#204060" } })
      .png()
      .toFile(cover);
    await writeOgImage(cover, out, { width: 70, height: 100, ratio: 0.7, edge: [32, 64, 96] });
    const png = readFileSync(join(out, "og-image.png"));
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});

const facts = { width: 70, height: 100, ratio: 0.7, edge: [0, 0, 0] as [number, number, number] };

describe("favicons", () => {
  it("generates a default open-book icon in the cover's edge colour when none is set", async () => {
    const out = tempDir();
    await writeFavicons(testConfig(tempDir()), out, { ...facts, edge: [11, 102, 112] });
    expect(readdirSync(out).sort()).toEqual([
      "apple-touch-icon.png",
      "favicon-32.png",
      "favicon.svg",
    ]);
    const svg = readFileSync(join(out, "favicon.svg"), "utf8");
    expect(svg).toContain('fill="#0b6670"');
    expect(svg).toContain("M12 5v16");
    expect(svg).toContain('stroke="#fbfbf9"');
    for (const [name, size] of [
      ["favicon-32.png", 32],
      ["apple-touch-icon.png", 180],
    ] as const) {
      const meta = await sharp(join(out, name)).metadata();
      expect([meta.width, meta.height]).toEqual([size, size]);
    }
  });

  it("draws the default icon dark on a light cover", async () => {
    const out = tempDir();
    await writeFavicons(testConfig(tempDir()), out, { ...facts, edge: [240, 235, 220] });
    expect(readFileSync(join(out, "favicon.svg"), "utf8")).toContain('stroke="#202a35"');
  });

  it("rejects a non-SVG favicon", async () => {
    const dir = tempDir({ "icon.png": PNG_1X1 });
    const error: unknown = await writeFavicons(
      testConfig(dir, { favicon: join(dir, "icon.png") }),
      tempDir(),
      facts,
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BookError);
    expect((error as BookError).reason).toMatch(/svg/);
  });

  it("rejects a missing favicon", async () => {
    const dir = tempDir();
    const error: unknown = await writeFavicons(
      testConfig(dir, { favicon: join(dir, "missing.svg") }),
      tempDir(),
      facts,
    ).catch((e: unknown) => e);
    expect((error as BookError).reason).toMatch(/svg/);
  });

  it("copies the SVG and renders square 32 px and 180 px PNGs", async () => {
    const out = tempDir();
    const favicon = fixture("book-en", "cover", "favicon.svg");
    await writeFavicons(testConfig(tempDir(), { favicon }), out, facts);
    expect(existsSync(join(out, "favicon.svg"))).toBe(true);
    for (const [name, size] of [
      ["favicon-32.png", 32],
      ["apple-touch-icon.png", 180],
    ] as const) {
      const meta = await sharp(join(out, name)).metadata();
      expect([meta.width, meta.height]).toEqual([size, size]);
    }
  });
});
