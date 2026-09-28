import { createServer, type Server } from "node:http";
import { readFileSync, readdirSync, statSync, writeFileSync, cpSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFontSet } from "../../../src/fonts/fetch.ts";
import { loadManifest } from "../../../src/fonts/manifest.ts";
import { BookError } from "../../../src/errors.ts";
import { FIXTURE_FONTS, FIXTURE_MANIFEST } from "../../helpers/fonts.ts";
import { tempDir } from "../../helpers/temp.ts";

const EXPECTED = [
  "LICENSE-OFL.txt",
  "NotoSansMono-Bold.ttf",
  "NotoSansMono-Regular.ttf",
  "NotoSansMyanmar-Bold.ttf",
  "NotoSansMyanmar-BoldItalic.ttf",
  "NotoSansMyanmar-Italic.ttf",
  "NotoSansMyanmar-Regular.ttf",
  "NotoSansMyanmar-SemiBold.ttf",
];

let server: Server | undefined;
afterEach(async () => {
  vi.unstubAllEnvs();
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

async function fetchMySans(source: string) {
  vi.stubEnv("MD2BOOK_FONTS_SOURCE", source);
  const manifest = await loadManifest(FIXTURE_MANIFEST);
  const root = tempDir();
  const result = await fetchFontSet(manifest.sets["my-sans"], { fontsDir: root, manifest });
  return { root, result, manifest };
}

describe("fetchFontSet", () => {
  it("copies and verifies every face and the licence from a local directory", async () => {
    const { root, result } = await fetchMySans(FIXTURE_FONTS);
    expect(result.dir).toBe(join(root, "my-sans"));
    expect(readdirSync(result.dir).sort()).toEqual(EXPECTED);
    expect(result.files.map((f) => f.split("/").pop()).sort()).toEqual(EXPECTED);
  });

  it("does not fetch files that are already present with the right hash", async () => {
    const { root, manifest } = await fetchMySans(FIXTURE_FONTS);
    const file = join(root, "my-sans", "NotoSansMyanmar-Regular.ttf");
    const mtime = statSync(file).mtimeMs;
    await fetchFontSet(manifest.sets["my-sans"], { fontsDir: root, manifest });
    expect(statSync(file).mtimeMs).toBe(mtime);
  });

  it("stops on a SHA-256 mismatch and keeps nothing for that file", async () => {
    const source = tempDir();
    cpSync(FIXTURE_FONTS, source, { recursive: true });
    const bad = join(source, "NotoSansMyanmar-Bold.ttf");
    writeFileSync(bad, Buffer.concat([readFileSync(bad), Buffer.from("x")]));

    const error: unknown = await fetchMySans(source).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BookError);
    expect((error as BookError).subject).toBe("NotoSansMyanmar-Bold.ttf");
    expect((error as BookError).reason).toMatch(/^SHA-256 mismatch/);
  });

  it("downloads from a URL source, verifying against the injected manifest", async () => {
    server = createServer((req, res) => {
      try {
        res.end(readFileSync(join(FIXTURE_FONTS, decodeURIComponent(req.url!.slice(1)))));
      } catch {
        res.statusCode = 404;
        res.end();
      }
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;

    const { result } = await fetchMySans(`http://127.0.0.1:${port}/`);
    expect(readdirSync(result.dir).sort()).toEqual(EXPECTED);
  });

  it("explains when the manifest's release URL is still a placeholder", async () => {
    vi.stubEnv("MD2BOOK_FONTS_SOURCE", "");
    const manifest = await loadManifest(FIXTURE_MANIFEST);
    const unpublished = { ...manifest, base_url: "<GitHub release download URL for fonts-v1>/" };
    const error: unknown = await fetchFontSet(unpublished.sets["my-sans"], {
      fontsDir: tempDir(),
      manifest: unpublished,
    }).catch((e: unknown) => e);
    expect(error).toEqual(
      new BookError(
        "fonts",
        "the font release is not published yet; set MD2BOOK_FONTS_SOURCE to a mirror URL or local folder",
      ),
    );
  });

  it("cannot reach a non-local URL in tests", async () => {
    const error: unknown = await fetchMySans("https://example.com/fonts/").catch((e: unknown) => e);
    expect(String(error)).toMatch(/network access in tests/);
  });
});
