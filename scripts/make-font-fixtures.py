#!/usr/bin/env python3
"""Maintainer tool: build tiny test fonts in test/fixtures/fonts-source/ (run once, commit output).

Subsets the book fonts from development-book/publish/fonts/ with fontTools so offline tests have
real TrueType files with known coverage (ASCII, plus Myanmar consonants U+1000-1021 for the
Myanmar and mono faces). No layout features: these files test fetching and coverage, not shaping. Never shipped in the package or used by the CLI.

  python scripts/make-font-fixtures.py [path/to/development-book/publish/fonts]

Needs fontTools (e.g. development-book/.venv/bin/python).
"""
from __future__ import annotations

import hashlib
import json
import shutil
import sys
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "test" / "fixtures" / "fonts-source"
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "development-book" / "publish" / "fonts"

ASCII = "U+0020-007E"
MYANMAR = "U+1000-1021"  # consonants only: enough for coverage tests, keeps files small
ROLES = ["body-regular", "body-semibold", "body-bold", "body-italic", "body-bolditalic", "mono-regular", "mono-bold"]
WEIGHTS = {"regular": 400, "semibold": 600, "bold": 700, "italic": 400, "bolditalic": 700}

MY_BODY = {
    "body-regular": "NotoSansMyanmar-Regular.ttf",
    "body-semibold": "NotoSansMyanmar-SemiBold.ttf",
    "body-bold": "NotoSansMyanmar-Bold.ttf",
    "body-italic": "NotoSansMyanmar-Italic.ttf",
    "body-bolditalic": "NotoSansMyanmar-BoldItalic.ttf",
}
EN_BODY = {role: name.replace("NotoSansMyanmar", "NotoSans") for role, name in MY_BODY.items()}
MONO = {"mono-regular": "NotoSansMono-Regular.ttf", "mono-bold": "NotoSansMono-Bold.ttf"}


def make(src: str, dest: str, unicodes: str) -> None:
    subset.main([
        str(SOURCE / src), f"--unicodes={unicodes}", f"--output-file={OUT / dest}",
        "--layout-features=", "--name-IDs=*", "--no-hinting", "--desubroutinize", "--notdef-outline",
    ])


def sha256(name: str) -> str:
    return hashlib.sha256((OUT / name).read_bytes()).hexdigest()


def face(role: str, file: str) -> dict:
    style = role.split("-")[1]
    return {"role": role, "file": file, "weight": WEIGHTS.get(style, 700 if role == "mono-bold" else 400),
            "italic": "italic" in style, "sha256": sha256(file)}


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    for role, name in MY_BODY.items():
        make(name, name, f"{ASCII},{MYANMAR}")          # Myanmar + Latin (like the real merged faces)
        make(name, EN_BODY[role], ASCII)                  # Latin-only stand-in for English faces
    for name in MONO.values():
        make(name, name, f"{ASCII},{MYANMAR}")
    shutil.copy(SOURCE / "LICENSE-OFL.txt", OUT / "LICENSE-OFL.txt")

    licence = {"file": "LICENSE-OFL.txt", "sha256": sha256("LICENSE-OFL.txt")}
    sets = {}
    for set_id, body, family in [
        ("my-sans", MY_BODY, "Noto Sans Myanmar"), ("my-serif", MY_BODY, "Noto Serif Myanmar"),
        ("en-sans", EN_BODY, "Noto Sans"), ("en-serif", EN_BODY, "Noto Serif"),
    ]:
        language, style = set_id.split("-")
        files = {**body, **MONO}
        sets[set_id] = {
            "language": language, "style": style, "body_family": family, "mono_family": "Noto Sans Mono",
            "faces": [face(role, files[role]) for role in ROLES], "licence": licence,
        }
    manifest = {"version": 1, "release": "fixture", "base_url": "fixture/", "sets": sets}
    (OUT / "fonts-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
