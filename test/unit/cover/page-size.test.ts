import { describe, expect, it } from "vitest";
import { pageSizePt } from "../../../src/cover/page-size.ts";

const round = (size: [number, number] | undefined) => size?.map((v) => Math.round(v * 100) / 100);

describe("pageSizePt", () => {
  it.each([
    ["170mm 240mm", [481.89, 680.31]],
    ["8.5in 11in", [612, 792]],
    ["21cm 29.7cm", [595.28, 841.89]],
    ["600px 800px", [450, 600]],
    ["30pc 40pc", [360, 480]],
    ["100pt", [100, 100]],
    ["A4", [595.28, 841.89]],
    ["A5 landscape", [595.28, 419.53]],
    ["landscape A5", [595.28, 419.53]],
    ["letter", [612, 792]],
    ["legal portrait", [612, 1008]],
  ])("%s", (size, expected) => {
    expect(round(pageSizePt(size))).toEqual(expected);
  });

  it.each(["", "auto", "portrait", "banana", "10em 20em"])("no fixed size for %j", (size) => {
    expect(pageSizePt(size)).toBeUndefined();
  });
});
