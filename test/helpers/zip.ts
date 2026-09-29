import yauzl from "yauzl";

export interface ZipEntry {
  name: string;
  method: number;
  extraLength: number;
  data: Buffer;
}

/** Every entry of a zip file in stored order, with compression method and content. */
export function readZip(path: string): Promise<ZipEntry[]> {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true }, (error, zip) => {
      if (error) return reject(error);
      const entries: ZipEntry[] = [];
      zip.on("entry", (entry: yauzl.Entry) => {
        zip.openReadStream(entry, (err, stream) => {
          if (err) return reject(err);
          const chunks: Buffer[] = [];
          stream.on("data", (c: Buffer) => chunks.push(c));
          stream.on("end", () => {
            entries.push({
              name: entry.fileName,
              method: entry.compressionMethod,
              extraLength: entry.extraFieldLength,
              data: Buffer.concat(chunks),
            });
            zip.readEntry();
          });
        });
      });
      zip.on("end", () => resolve(entries));
      zip.on("error", reject);
      zip.readEntry();
    });
  });
}
