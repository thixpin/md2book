import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/** Nearest ancestor (or the directory itself) containing `.git`, else `startDir`. */
export function findCodeRoot(startDir: string): string {
  for (let dir = startDir; ; dir = dirname(dir)) {
    if (existsSync(join(dir, ".git"))) return dir;
    if (dirname(dir) === dir) return startDir;
  }
}
