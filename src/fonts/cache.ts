import { homedir } from "node:os";
import { join } from "node:path";

/** Cache root: `--fonts` → MD2BOOK_FONTS → $XDG_CACHE_HOME/md2book/fonts → ~/.cache/md2book/fonts. */
export function fontsRoot(options: { fontsDir?: string }): string {
  if (options.fontsDir) return options.fontsDir;
  if (process.env.MD2BOOK_FONTS) return process.env.MD2BOOK_FONTS;
  const cache = process.env.XDG_CACHE_HOME || join(homedir(), ".cache");
  return join(cache, "md2book", "fonts");
}

export function setDir(root: string, setId: string): string {
  return join(root, setId);
}
