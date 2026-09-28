import sharp from "sharp";

export interface CoverFacts {
  width: number;
  height: number;
  /** width / height */
  ratio: number;
  /** average RGB of the four edges */
  edge: [number, number, number];
}

/**
 * Cover ratio and average edge colour, sampled like the reference: columns 1 and w-2 every
 * h//40 rows, then rows 1 and h-2 every w//40 columns.
 */
export async function coverFacts(path: string): Promise<CoverFacts> {
  const { data, info } = await sharp(path)
    .toColourspace("srgb")
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;
  const pixel = (x: number, y: number) => {
    const i = (y * w + x) * channels;
    return [data[i]!, data[i + 1]!, data[i + 2]!];
  };
  const stepY = Math.max(1, Math.floor(h / 40));
  const stepX = Math.max(1, Math.floor(w / 40));
  const samples: number[][] = [];
  for (const x of [1, w - 2]) for (let y = 0; y < h; y += stepY) samples.push(pixel(x, y));
  for (const y of [1, h - 2]) for (let x = 0; x < w; x += stepX) samples.push(pixel(x, y));
  const edge = [0, 1, 2].map(
    (c) => samples.reduce((sum, s) => sum + s[c]!, 0) / samples.length,
  ) as [number, number, number];
  return { width: w, height: h, ratio: w / h, edge };
}

/** Python's round(): halves go to the even neighbour (matches the reference output). */
export function pyRound(value: number): number {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

export function edgeCss(edge: CoverFacts["edge"]): string {
  return `rgb(${edge.map(pyRound).join(" ")})`;
}
