import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { coverFacts } from "../../../src/web/images.ts";
import { tempDir } from "../../helpers/temp.ts";

describe("coverFacts", () => {
  it("gives the width/height ratio and the average colour of the four edges", async () => {
    // 80×120: a red border (4 px) around a blue centre, so every edge sample is red.
    const path = join(tempDir(), "cover.png");
    await sharp({ create: { width: 80, height: 120, channels: 3, background: "#ff0000" } })
      .composite([
        {
          input: await sharp({
            create: { width: 72, height: 112, channels: 3, background: "#0000ff" },
          })
            .png()
            .toBuffer(),
          left: 4,
          top: 4,
        },
      ])
      .png()
      .toFile(path);
    const facts = await coverFacts(path);
    expect(facts.ratio).toBeCloseTo(80 / 120, 10);
    expect(facts.edge).toEqual([255, 0, 0]);
    expect(facts.width).toBe(80);
  });
});
