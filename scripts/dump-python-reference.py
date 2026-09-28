#!/usr/bin/env python3
"""Development tool: dump the Python toolchain's manuscript data for the equivalence check.

Imports development-book/publish/build.py (the reference implementation, d235dbd) and prints
JSON with, per chapter: position data, part, sections, includes, plain text and structure counts.
Never shipped or used by the CLI/API. Run by scripts/equivalence.ts.

  DEVBOOK=/path/to/development-book python scripts/dump-python-reference.py book-01
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

devbook = Path(os.environ.get("DEVBOOK", "")).resolve()
if not (devbook / "publish" / "build.py").is_file():
    sys.exit("dump-python-reference: set DEVBOOK to a development-book checkout")
sys.path.insert(0, str(devbook / "publish"))

import build  # noqa: E402


def counts(html: str) -> dict[str, int]:
    pres = re.findall(r'<pre(?: class="([^"]*)")?>', html)
    return {
        "terminal": html.count('<div class="terminal">'),
        "code": sum(1 for c in pres if "code" in c.split()),
        "wide": sum(1 for c in pres if "wide" in c.split()),
        "xwide": sum(1 for c in pres if "xwide" in c.split()),
        "table": html.count("<table"),
        "callout_note": html.count("callout-note"),
        "callout_warning": html.count("callout-warning"),
        "callout_try": html.count("callout-try"),
    }


def main() -> None:
    book = sys.argv[1] if len(sys.argv) > 1 else "book-01"
    meta = build.load_meta(book)
    chapters = build.load_chapters(meta)
    parts = build.load_parts(meta, chapters)
    build.render_chapters(chapters)
    part_of = {id(ch): p.label for p in parts for ch in p.chapters}
    print(json.dumps({"chapters": [{
        "index": ch.index, "slug": ch.slug, "label": ch.label, "title": ch.title, "number": ch.number,
        "sections": ch.sections, "part": part_of.get(id(ch)), "includes": ch.includes,
        "plain_text": ch.plain_text, "counts": counts(ch.body_html),
    } for ch in chapters]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
