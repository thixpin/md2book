import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const DPI = 110;

/** Renders the sample pages at 110 dpi to `dir/page-NNN-<name>.png`; `dir` is rebuilt (qa.py). */
export async function writeSamples(
  file: string,
  samples: [number, string][],
  dir: string,
): Promise<string[]> {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const task = getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 });
  const pdf = await task.promise;
  try {
    const names: string[] = [];
    for (const [number, name] of samples) {
      const page = await pdf.getPage(number);
      const viewport = page.getViewport({ scale: DPI / 72 });
      const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
      await page.render({
        canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
        viewport,
        canvas: canvas as unknown as HTMLCanvasElement,
      }).promise;
      const target = `page-${String(number).padStart(3, "0")}-${name}.png`;
      writeFileSync(join(dir, target), canvas.toBuffer("image/png"));
      names.push(target);
    }
    return names;
  } finally {
    await task.destroy();
  }
}
