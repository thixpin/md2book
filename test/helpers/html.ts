import { parse, type DefaultTreeAdapterTypes } from "parse5";

type Node = DefaultTreeAdapterTypes.ChildNode | DefaultTreeAdapterTypes.Document;
export type Element = DefaultTreeAdapterTypes.Element;

/** All elements of an HTML document, in document order; `opaque` tags keep their children out. */
export function elements(html: string, opaque: string[] = []): Element[] {
  const out: Element[] = [];
  const walk = (node: Node) => {
    if ("tagName" in node) out.push(node);
    if ("tagName" in node && opaque.includes(node.tagName)) return;
    if ("childNodes" in node) node.childNodes.forEach(walk);
    if ("content" in node && node.content) node.content.childNodes.forEach(walk);
  };
  walk(parse(html));
  return out;
}

export const attr = (el: Element, name: string) => el.attrs.find((a) => a.name === name)?.value;

/** Tag, classes, id, role and attribute names (no values) of every element: a DOM skeleton. */
export function skeleton(html: string, opaque: string[] = []): string[] {
  return elements(html, opaque).map((el) => {
    const names = el.attrs
      .map((a) => a.name)
      .filter((n) => n !== "class")
      .sort();
    return `${el.tagName}.${(attr(el, "class") ?? "").split(" ").filter(Boolean).join(".")}[${names.join(",")}]`;
  });
}

export function find(html: string, predicate: (el: Element) => boolean): Element[] {
  return elements(html).filter(predicate);
}
