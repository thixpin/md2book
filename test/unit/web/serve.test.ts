import { request } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { serveDir } from "../../../src/web/serve.ts";
import { BookError } from "../../../src/errors.ts";
import { tempDir } from "../../helpers/temp.ts";

const servers: { close(): Promise<void> }[] = [];
afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
});

function site() {
  return tempDir({
    "index.html": "<p>home</p>",
    "404.html": "<p>missing</p>",
    "chapters/ch01.html": "<p>one</p>",
    "style.abc.css": "body{}",
    "sitemap.xml": "<urlset/>",
    "fonts/A.ttf": "ttf",
  });
}

async function start(root = site(), port = 0) {
  const server = await serveDir(root, port);
  servers.push(server);
  return server;
}

/** Raw request, so a `..` path is sent as-is (fetch would normalise it). */
function get(port: number, path: string): Promise<{ status: number; type: string; body: string }> {
  return new Promise((resolve, reject) => {
    request({ host: "127.0.0.1", port, path }, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => (body += chunk.toString()));
      res.on("end", () =>
        resolve({ status: res.statusCode!, type: String(res.headers["content-type"]), body }),
      );
    })
      .on("error", reject)
      .end();
  });
}

describe("serveDir", () => {
  it("serves index.html at / and files with content types", async () => {
    const { port, url } = await start();
    expect(url).toBe(`http://127.0.0.1:${port}/`);
    expect(await get(port, "/")).toMatchObject({ status: 200, body: "<p>home</p>" });
    expect((await get(port, "/")).type).toMatch(/^text\/html/);
    expect(await get(port, "/chapters/ch01.html")).toMatchObject({
      status: 200,
      body: "<p>one</p>",
    });
    expect((await get(port, "/style.abc.css")).type).toMatch(/^text\/css/);
    expect((await get(port, "/fonts/A.ttf")).type).toBe("font/ttf");
  });

  it("serves sitemap.xml as XML", async () => {
    const { port } = await start();
    expect((await get(port, "/sitemap.xml")).type).toBe("application/xml; charset=utf-8");
  });

  it("serves the site under its path, as GitHub project Pages do", async () => {
    const server = await serveDir(site(), 0, "/my-book");
    servers.push(server);
    expect(server.url).toBe(`http://127.0.0.1:${server.port}/my-book/`);
    expect(await get(server.port, "/my-book/")).toMatchObject({ status: 200, body: "<p>home</p>" });
    expect(await get(server.port, "/my-book")).toMatchObject({ status: 200, body: "<p>home</p>" });
    expect(await get(server.port, "/my-book/chapters/ch01.html")).toMatchObject({
      status: 200,
      body: "<p>one</p>",
    });
    expect(await get(server.port, "/chapters/ch01.html")).toMatchObject({
      status: 404,
      body: "<p>missing</p>",
    });
  });

  it("answers unknown paths with 404.html and status 404", async () => {
    const { port } = await start();
    expect(await get(port, "/nope.html")).toMatchObject({ status: 404, body: "<p>missing</p>" });
  });

  it("never serves files outside the site", async () => {
    const root = site();
    const { port } = await start(root);
    const response = await get(port, "/../../../../etc/passwd");
    expect(response.status).toBe(404);
    expect(response.body).toBe("<p>missing</p>");
  });

  it("stops with one line naming a busy port", async () => {
    const { port } = await start();
    const error: unknown = await serveDir(site(), port).catch((e: unknown) => e);
    expect(error).toEqual(new BookError(`127.0.0.1:${port}`, "port already in use"));
  });

  it("stops serving on close()", async () => {
    const server = await serveDir(site(), 0);
    await server.close();
    await expect(get(server.port, "/")).rejects.toThrow();
  });
});
