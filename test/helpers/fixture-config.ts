import { loadConfig, type BookConfig } from "../../src/config/load.ts";
import { fixture } from "./temp.ts";

export async function bookMm(): Promise<BookConfig> {
  return (await loadConfig(fixture("book-mm", "book.json"))).config;
}

export async function bookEn(): Promise<BookConfig> {
  return (await loadConfig(fixture("book-en", "book.json"))).config;
}

export async function bookHeadings(): Promise<BookConfig> {
  return (await loadConfig(fixture("book-headings", "book.json"))).config;
}
