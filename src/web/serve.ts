import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, resolve, sep } from "node:path";
import { BookError } from "../errors.ts";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
};

export interface Served {
  url: string;
  port: number;
  close(): Promise<void>;
}

/** Local preview of a built site on 127.0.0.1; unknown paths get `404.html` with status 404. */
export function serveDir(root: string, port = 8000): Promise<Served> {
  const base = resolve(root);
  const server = createServer((req, res) => {
    let path: string;
    try {
      path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    } catch {
      path = "/";
    }
    let file = resolve(join(base, path));
    if (file === base || (existsSync(file) && statSync(file).isDirectory())) {
      file = join(file, "index.html");
    }
    const inside = file.startsWith(base + sep);
    const found = inside && existsSync(file) && statSync(file).isFile();
    const target = found ? file : join(base, "404.html");
    res.writeHead(found ? 200 : 404, {
      "content-type": TYPES[extname(target).toLowerCase()] ?? "application/octet-stream",
    });
    if (existsSync(target)) createReadStream(target).pipe(res);
    else res.end("Not found");
  });

  return new Promise((resolvePromise, reject) => {
    server.once("error", (error: NodeJS.ErrnoException) => {
      reject(
        error.code === "EADDRINUSE"
          ? new BookError(`127.0.0.1:${port}`, "port already in use")
          : error,
      );
    });
    server.listen(port, "127.0.0.1", () => {
      const actual = (server.address() as AddressInfo).port;
      resolvePromise({
        url: `http://127.0.0.1:${actual}/`,
        port: actual,
        close: () =>
          new Promise<void>((done) => {
            server.closeAllConnections();
            server.close(() => done());
          }),
      });
    });
  });
}
