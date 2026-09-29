// The package ships no type declarations; only the function used here is declared.
declare module "unicode-name" {
  /** The Unicode character name, or undefined when the code point has none. */
  export function unicodeName(char: string | number): string | undefined;
}
