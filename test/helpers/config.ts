import { join } from "node:path";
import { defaultStrings, type FontStyle, type Language } from "../../src/config/language.ts";
import type { BookConfig } from "../../src/config/load.ts";

/** A resolved config for tests that do not need loadConfig. */
export function testConfig(
  dir: string,
  overrides: Partial<BookConfig> & { language?: Language; font_set?: FontStyle } = {},
): BookConfig {
  const language = overrides.language ?? "my";
  const font_set = overrides.font_set ?? "sans";
  return {
    title: "T",
    author: "A",
    year: "2026",
    identifier: "urn:uuid:x",
    output_name: "t",
    cover: join(dir, "cover.png"),
    chapter_glob: join(dir, "chapters", "chapter-*.md"),
    recto_chapter_start: false,
    running_headers: true,
    configPath: join(dir, "book.json"),
    configDir: dir,
    code_root: dir,
    ...overrides,
    language,
    font_set,
    strings: overrides.strings ?? defaultStrings(language, font_set),
  };
}
