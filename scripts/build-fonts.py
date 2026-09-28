#!/usr/bin/env python3
"""Maintainer tool: build the four curated font sets and write assets/fonts-manifest.json.

Extended from development-book/publish/fonts.py (d235dbd). Never run by the CLI or the
programmatic API; the tool only downloads the prebuilt files this script produces.

  my-sans   Noto Sans Myanmar  = Noto Sans Myanmar + Noto Sans (Latin scaled 0.93)  [REF §7]
  my-serif  Noto Serif Myanmar = Noto Serif Myanmar + Noto Serif (Latin scaled 0.93)
  en-sans   Noto Sans          (stock faces, no merge)
  en-serif  Noto Serif         (stock faces, no merge)
  mono      Noto Sans Mono     = Noto Sans Mono + Noto Sans Myanmar; shared by all four sets

Myanmar italics are Myanmar glyphs obliqued 12° (GPOS mark anchors shifted to match) merged with
the Latin family's true italics. After building, every face is checked for coverage (SC-006):
Myanmar sets need U+1000 and 'a', English sets need 'a'. Any missing upstream face or failed
check stops the script with a non-zero exit.

  python scripts/build-fonts.py        (needs fontTools and network access once)
Output: build/fonts/ (git-ignored; uploaded to the fonts-v1 release) and assets/fonts-manifest.json.
"""
from __future__ import annotations

import hashlib
import io
import json
import math
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

from fontTools.merge import Merger
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.scaleUpem import scale_upem

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "build" / "fonts"
MANIFEST = ROOT / "assets" / "fonts-manifest.json"
LANGUAGE_TS = ROOT / "src" / "config" / "language.ts"

RELEASE = "fonts-v1"
BASE_URL = "<GitHub release download URL for fonts-v1>/"
LATIN_SCALE = 0.93
ITALIC_ANGLE = 12.0

RELEASE_API = {
    "myanmar": "https://api.github.com/repos/notofonts/myanmar/releases?per_page=60",
    "lgc": "https://api.github.com/repos/notofonts/latin-greek-cyrillic/releases?per_page=60",
}
FAMILIES = {
    "NotoSansMyanmar": "myanmar", "NotoSerifMyanmar": "myanmar",
    "NotoSans": "lgc", "NotoSerif": "lgc", "NotoSansMono": "lgc",
}
ROLES = ["body-regular", "body-semibold", "body-bold", "body-italic", "body-bolditalic", "mono-regular", "mono-bold"]
STYLE = {  # role -> (upstream face, weight, italic)
    "body-regular": ("Regular", 400, False), "body-semibold": ("SemiBold", 600, False),
    "body-bold": ("Bold", 700, False), "body-italic": ("Italic", 400, True),
    "body-bolditalic": ("BoldItalic", 700, True),
    "mono-regular": ("Regular", 400, False), "mono-bold": ("Bold", 700, False),
}
SUBFAMILY = {(400, False): "Regular", (700, False): "Bold", (400, True): "Italic",
             (700, True): "Bold Italic", (600, False): "SemiBold"}
# set id -> (body family name, Myanmar source family or None, Latin source family)
SETS = {
    "my-sans": ("Noto Sans Myanmar", "NotoSansMyanmar", "NotoSans"),
    "my-serif": ("Noto Serif Myanmar", "NotoSerifMyanmar", "NotoSerif"),
    "en-sans": ("Noto Sans", None, "NotoSans"),
    "en-serif": ("Noto Serif", None, "NotoSerif"),
}
MONO_FILES = {"mono-regular": "NotoSansMono-Regular.ttf", "mono-bold": "NotoSansMono-Bold.ttf"}


def fail(message: str) -> None:
    sys.exit(f"build-fonts: {message}")


def release_assets() -> dict[str, str]:
    urls: dict[str, str] = {}
    for repo, api in RELEASE_API.items():
        with urllib.request.urlopen(api, timeout=60) as r:
            releases = json.load(r)
        for rel in releases:
            for asset in rel.get("assets", []):
                fam = asset["name"].split("-v")[0]
                if FAMILIES.get(fam) == repo and fam not in urls and asset["name"].endswith(".zip"):
                    urls[fam] = asset["browser_download_url"]
    missing = [f for f in FAMILIES if f not in urls]
    if missing:
        fail(f"no release asset found for {missing}")
    return urls


def fetch_zip(url: str) -> zipfile.ZipFile:
    print(f"Downloading {url}")
    with urllib.request.urlopen(url, timeout=600) as r:
        return zipfile.ZipFile(io.BytesIO(r.read()))


def extract(zips: dict[str, zipfile.ZipFile], family: str, face: str) -> bytes:
    want = f"{family}/unhinted/ttf/{family}-{face}.ttf"
    for name in zips[family].namelist():
        if name.endswith(want):
            return zips[family].read(name)
    fail(f"upstream face missing: {want} (not substituted)")
    raise AssertionError


def scaled(path: Path, scale: float) -> Path:
    if scale == 1.0:
        return path
    font = TTFont(str(path))
    upem = font["head"].unitsPerEm
    scale_upem(font, int(round(upem * scale)))
    font["head"].unitsPerEm = upem
    out = path.with_name(path.stem + "-scaled.ttf")
    font.save(str(out))
    return out


def slanted(path: Path, angle: float) -> Path:
    font = TTFont(str(path))
    skew = math.tan(math.radians(angle))
    glyf, hmtx = font["glyf"], font["hmtx"]
    glyph_set = font.getGlyphSet()
    new_glyphs = {}
    for name in font.getGlyphOrder():
        rec = DecomposingRecordingPen(glyph_set)
        glyph_set[name].draw(rec)
        pen = TTGlyphPen(None)
        rec.replay(TransformPen(pen, (1, 0, skew, 1, 0, 0)))
        new_glyphs[name] = pen.glyph()
    for name, glyph in new_glyphs.items():
        glyph.recalcBounds(glyf)
        glyf[name] = glyph
        adv, _ = hmtx[name]
        hmtx[name] = (adv, getattr(glyph, "xMin", 0))

    def shift(anchor):
        if anchor is not None:
            anchor.XCoordinate = int(round(anchor.XCoordinate + skew * anchor.YCoordinate))

    if "GPOS" in font:
        for lookup in font["GPOS"].table.LookupList.Lookup:
            for sub in lookup.SubTable:
                if lookup.LookupType == 9:
                    sub = sub.ExtSubTable
                lt = getattr(sub, "LookupType", lookup.LookupType)
                if lt == 4:
                    for m in sub.MarkArray.MarkRecord:
                        shift(m.MarkAnchor)
                    for r in sub.BaseArray.BaseRecord:
                        for a in r.BaseAnchor:
                            shift(a)
                elif lt == 5:
                    for m in sub.MarkArray.MarkRecord:
                        shift(m.MarkAnchor)
                    for lig in sub.LigatureArray.LigatureAttach:
                        for comp in lig.ComponentRecord:
                            for a in comp.LigatureAnchor:
                                shift(a)
                elif lt == 6:
                    for m in sub.Mark1Array.MarkRecord:
                        shift(m.MarkAnchor)
                    for r in sub.Mark2Array.Mark2Record:
                        for a in r.Mark2Anchor:
                            shift(a)
    out = path.with_name(path.stem + "-oblique.ttf")
    font.save(str(out))
    return out


def set_style(font: TTFont, family: str, ps_base: str, weight: int, italic: bool) -> None:
    subfamily = SUBFAMILY[(weight, italic)]
    bold = weight >= 700
    name = font["name"]
    full = family if subfamily == "Regular" else f"{family} {subfamily}"
    ps = f"{ps_base}-{subfamily.replace(' ', '')}"
    for rec in list(name.names):
        if rec.nameID in (16, 17):
            name.names.remove(rec)
    for nid, value in ((1, family), (2, subfamily if subfamily in ("Regular", "Bold", "Italic", "Bold Italic") else "Regular"),
                       (3, f"{ps};merged"), (4, full), (6, ps), (16, family), (17, subfamily)):
        name.setName(value, nid, 3, 1, 0x409)
        name.setName(value, nid, 1, 0, 0)
    os2 = font["OS/2"]
    fs = (1 if italic else 0) | (1 << 5 if bold else 0)
    if not italic and not bold:
        fs |= 1 << 6
    os2.fsSelection = (os2.fsSelection & ~0b1100001) | fs
    os2.usWeightClass = weight
    font["head"].macStyle = (1 if bold else 0) | (2 if italic else 0)
    font["post"].italicAngle = -ITALIC_ANGLE if italic else 0.0


def merge(tmp: Path, zips, out_name: str, family: str, primary: tuple[str, str],
          secondary: tuple[str, str], scale: float, weight: int, italic: bool, slant: bool) -> None:
    p1 = tmp / f"{primary[0]}-{primary[1]}.ttf"
    p2 = tmp / f"{secondary[0]}-{secondary[1]}.ttf"
    p1.write_bytes(extract(zips, *primary))
    p2.write_bytes(extract(zips, *secondary))
    if slant:
        p1 = slanted(p1, ITALIC_ANGLE)
    merged = Merger().merge([str(p1), str(scaled(p2, scale))])
    set_style(merged, family, out_name.split("-")[0], weight, italic)
    merged.save(str(OUT / out_name))


def sha256(name: str) -> str:
    return hashlib.sha256((OUT / name).read_bytes()).hexdigest()


def catalogue() -> dict[str, str]:
    """Body family names from src/config/language.ts (FONT_FAMILIES), the typeface_line source."""
    return dict(re.findall(r'"((?:my|en)-(?:sans|serif))": "([^"]+)"', LANGUAGE_TS.read_text()))


def check(sets: dict) -> None:
    errors = []
    families = catalogue()
    for set_id, entry in sets.items():
        if families.get(set_id) != entry["body_family"]:
            errors.append(f"{set_id}: body_family {entry['body_family']!r} != catalogue {families.get(set_id)!r}")
        for face in entry["faces"]:
            cmap = TTFont(str(OUT / face["file"])).getBestCmap()
            needed = [0x1000, 0x61] if entry["language"] == "my" else [0x61]
            for cp in needed:
                if cp not in cmap:
                    errors.append(f"{set_id}: {face['file']} lacks U+{cp:04X} (SC-006)")
            print(f"{set_id} {face['file']}: {len(cmap)} codepoints")
    if errors:
        fail("coverage check failed:\n  " + "\n  ".join(errors))
    print("SC-006 coverage check passed for all four sets")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    zips = {fam: fetch_zip(url) for fam, url in release_assets().items()}
    tmp = OUT / "_src"
    tmp.mkdir(exist_ok=True)

    for role, out_name in MONO_FILES.items():
        face, weight, _ = STYLE[role]
        merge(tmp, zips, out_name, "Noto Sans Mono", ("NotoSansMono", face), ("NotoSansMyanmar", face),
              1.0, weight, False, False)

    sets = {}
    for set_id, (family, myanmar, latin) in SETS.items():
        files = dict(MONO_FILES)
        for role in ROLES[:5]:
            face, weight, italic = STYLE[role]
            if myanmar:
                out_name = f"{myanmar}-{face}.ttf"
                merge(tmp, zips, out_name, family, (myanmar, "Bold" if face == "BoldItalic" else
                      "Regular" if face == "Italic" else face), (latin, face), LATIN_SCALE, weight, italic, italic)
            else:
                out_name = f"{latin}-{face}.ttf"
                (OUT / out_name).write_bytes(extract(zips, latin, face))
            files[role] = out_name
        language, style = set_id.split("-")
        sets[set_id] = {
            "language": language, "style": style, "body_family": family, "mono_family": "Noto Sans Mono",
            "faces": [{"role": role, "file": files[role], "weight": STYLE[role][1], "italic": STYLE[role][2],
                       "sha256": sha256(files[role])} for role in ROLES],
        }
    for p in tmp.iterdir():
        p.unlink()
    tmp.rmdir()

    for name in zips["NotoSansMyanmar"].namelist():
        if name.endswith("OFL.txt"):
            (OUT / "LICENSE-OFL.txt").write_bytes(zips["NotoSansMyanmar"].read(name))
            break
    else:
        fail("OFL.txt not found in the Noto Sans Myanmar release")
    for entry in sets.values():
        entry["licence"] = {"file": "LICENSE-OFL.txt", "sha256": sha256("LICENSE-OFL.txt")}

    check(sets)
    manifest = {"version": 1, "release": RELEASE, "base_url": BASE_URL, "sets": sets}
    MANIFEST.parent.mkdir(exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Fonts written to {OUT}; manifest written to {MANIFEST}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
