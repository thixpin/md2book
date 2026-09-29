// Points per unit (CSS absolute lengths).
const UNITS: Record<string, number> = {
  pt: 1,
  px: 0.75,
  pc: 12,
  in: 72,
  cm: 72 / 2.54,
  mm: 72 / 25.4,
  q: 72 / 101.6,
};

// CSS Paged Media named page sizes, portrait, in millimetres or inches.
const NAMED: Record<string, [number, number, string]> = {
  a5: [148, 210, "mm"],
  a4: [210, 297, "mm"],
  a3: [297, 420, "mm"],
  b5: [176, 250, "mm"],
  b4: [250, 353, "mm"],
  "jis-b5": [182, 257, "mm"],
  "jis-b4": [257, 364, "mm"],
  letter: [8.5, 11, "in"],
  legal: [8.5, 14, "in"],
  ledger: [11, 17, "in"],
};

function length(token: string): number | undefined {
  const match = /^(\d+(?:\.\d+)?)([a-z]+)$/i.exec(token);
  const unit = match && UNITS[match[2]!.toLowerCase()];
  return unit ? Number(match[1]) * unit : undefined;
}

/** The page size in points of an `@page` `size` value, or undefined when it fixes none. */
export function pageSizePt(size: string): [number, number] | undefined {
  const tokens = size.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const orientation = tokens.find((t) => t === "landscape" || t === "portrait");
  const rest = tokens.filter((t) => t !== orientation);
  let page: [number, number] | undefined;
  if (rest.length === 1 && NAMED[rest[0]!]) {
    const [w, h, unit] = NAMED[rest[0]!]!;
    page = [w * UNITS[unit]!, h * UNITS[unit]!];
  } else if (rest.length === 1 || rest.length === 2) {
    const lengths = rest.map(length);
    if (lengths.every((v) => v !== undefined)) {
      page = [lengths[0]!, lengths[1] ?? lengths[0]!];
    }
  }
  if (!page) return undefined;
  if (orientation === "landscape" && page[0] < page[1]) return [page[1], page[0]];
  if (orientation === "portrait" && page[0] > page[1]) return [page[1], page[0]];
  return page;
}
