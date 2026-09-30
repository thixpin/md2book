#!/usr/bin/env python3
"""Maintainer tool: build tiny test fonts in test/fixtures/fonts-source/ (run once, commit output).

Subsets the book fonts from development-book/publish/fonts/ with fontTools so offline tests have
real TrueType files with known coverage (ASCII, plus Myanmar consonants U+1000-1021 for the
Myanmar and mono faces). No layout features: these files test fetching and coverage, not shaping. Never shipped in the package or used by the CLI.

  python scripts/make-font-fixtures.py [path/to/development-book/publish/fonts]

With --print it writes test/fixtures/fonts-print/ instead: the shipped faces (default
build/fonts/, from scripts/build-fonts.py) with the whole Myanmar block, Latin-1 and punctuation,
and their layout features, so the PDF tests shape Burmese exactly like the real fonts without
falling back to system fonts.

  python scripts/make-font-fixtures.py --print [path/to/build/fonts]

With --print --add-families it adds only the spec 006 sets (my-padauk, my-masterpiece) to
test/fixtures/fonts-print/, leaving the existing fixture files and sets untouched.

  python scripts/make-font-fixtures.py --print --add-families [path/to/build/fonts]

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
PRINT = "--print" in sys.argv
ADD = "--add-families" in sys.argv
ARGS = [a for a in sys.argv[1:] if a not in ("--print", "--add-families")]
OUT = ROOT / "test" / "fixtures" / ("fonts-print" if PRINT else "fonts-source")
DEFAULT_SOURCE = ROOT / "build" / "fonts" if PRINT else ROOT.parent / "development-book" / "publish" / "fonts"
SOURCE = Path(ARGS[0]) if ARGS else DEFAULT_SOURCE

ASCII = "U+0020-007E"
MYANMAR = "U+1000-1021"  # consonants only: enough for coverage tests, keeps files small
# --print: what the PDF fixtures use (Latin-1, punctuation, arrows, box drawing, all Myanmar).
PRINT_LATIN = "U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-205E,U+2190-21FF,U+2500-257F"
PRINT_MYANMAR = "U+1000-109F,U+A9E0-A9FF,U+AA60-AA7F"
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
        f"--layout-features={'*' if PRINT else ''}", "--name-IDs=*", "--no-hinting",
        "--desubroutinize", "--notdef-outline",
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
    latin, myanmar = (PRINT_LATIN, PRINT_MYANMAR) if PRINT else (ASCII, MYANMAR)
    for role, name in MY_BODY.items():
        make(name, name, f"{latin},{myanmar}")          # Myanmar + Latin (like the real merged faces)
        if PRINT:
            make(EN_BODY[role], EN_BODY[role], latin)     # the real English faces
        else:
            make(name, EN_BODY[role], ASCII)              # Latin-only stand-in for English faces
    for name in MONO.values():
        make(name, name, f"{latin},{myanmar}")
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


ADDED = {  # set id -> body family, faces by role, licence file
    "my-padauk": ("Padauk", {"body-regular": "Padauk-Regular.ttf", "body-semibold": "Padauk-SemiBold.ttf",
                             "body-bold": "Padauk-Bold.ttf"}, "Padauk-OFL.txt"),
    "my-masterpiece": ("Masterpiece Uni Round", {"body-regular": "MasterpieceUniRound-Regular.ttf"},
                       "MasterpieceUniRound-OFL.txt"),
}


def add_families() -> None:
    if not PRINT:
        sys.exit("--add-families needs --print")
    path = OUT / "fonts-manifest.json"
    manifest = json.loads(path.read_text())
    mono = [f for f in manifest["sets"]["my-sans"]["faces"] if f["role"].startswith("mono-")]
    for set_id, (family, body, licence) in ADDED.items():
        for name in body.values():
            # Padauk's OFL reserves its name, so a subset (a modified copy) may not be called
            # Padauk: the fixture keeps SIL's unmodified files.
            if set_id == "my-padauk":
                shutil.copy(SOURCE / name, OUT / name)
            else:
                make(name, name, f"{PRINT_LATIN},{PRINT_MYANMAR}")
        shutil.copy(SOURCE / licence, OUT / licence)
        manifest["sets"][set_id] = {
            "language": "my", "body_family": family, "mono_family": "Noto Sans Mono",
            "faces": [face(role, name) for role, name in body.items()] + mono,
            "licence": {"file": licence, "sha256": sha256(licence)},
        }
    path.write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    add_families() if ADD else main()
