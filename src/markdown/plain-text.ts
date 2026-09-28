import { decodeHTML } from "entities";

/** Port of Python `html_to_text`: tags → space, entities decoded, space/tab runs collapsed. */
export function htmlToText(fragment: string): string {
  return decodeHTML(fragment.replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ");
}
