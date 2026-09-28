/** Port of Python's textwrap.dedent (spaces and tabs only; whitespace-only lines emptied). */
export function dedent(text: string): string {
  const lines = text.split("\n").map((line) => (/^[ \t]+$/.test(line) ? "" : line));
  let margin: string | undefined;
  for (const line of lines) {
    if (line === "") continue;
    const indent = /^[ \t]*/.exec(line)![0];
    if (margin === undefined || margin.startsWith(indent)) {
      margin = indent;
    } else if (!indent.startsWith(margin)) {
      let i = 0;
      while (i < margin.length && margin[i] === indent[i]) i++;
      margin = margin.slice(0, i);
    }
  }
  if (!margin) return lines.join("\n");
  const cut = margin.length;
  return lines.map((line) => line.slice(line === "" ? 0 : cut)).join("\n");
}
