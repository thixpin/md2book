/** ASCII file-name stem from a title: `a-z0-9` runs joined by hyphens, or `book` if none. */
export function titleSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "book";
}
