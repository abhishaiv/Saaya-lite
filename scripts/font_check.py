#!/usr/bin/env python3
"""Verify shipped font subsets against pinned upstream sources and real copy."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from collections import Counter
from functools import lru_cache
from pathlib import Path

from fontTools.ttLib import TTFont


ROW_RE = re.compile(
    r"^\|\s*`(?P<key>[^`]+)`(?:\s+\*\*[^|]*\*\*)?\s*\|"
    r"\s*(?P<english>.*?)\s*\|\s*(?P<telugu>.*?)\s*\|\s*$"
)

EXPECTED_SOURCE_SHA256 = {
    "Poppins-Regular.ttf": "7e65201e9b79159e2300267cc885e16c8dcef2424cdfa09a29bfb0980a94a7ba",
    "Poppins-SemiBold.ttf": "d3bf1bdaf0550e83da9ac0b1d1d9fe6db086835a83aa28578e609a394b9a0286",
    "Poppins-Bold.ttf": "983676516167748b74de6f4771fb384c664fd913acb8b471122ecacf5da5ea6c",
    "NotoSansTelugu[wdth,wght].ttf": "e618af7bf999df192ed4f388eba2e563f2b5015034e9cbb317b5bd793bd7334d",
    "MaterialSymbolsRounded[FILL,GRAD,opsz,wght].ttf": "c2c185c2f31193348f34ae454215d990bb49f494c45e79348d9f2b3d653607d7",
    "MaterialSymbolsRounded[FILL,GRAD,opsz,wght].codepoints": "cb8e63e819c1172b9653b7f15fecd024ac329f7854f65e9c7dc7cc9b78d993eb",
    "OFL-poppins.txt": "6be04893d770899a015649c7aa3b582f871b272f8747a92b78b17c3e5c8b2573",
    "OFL-notosanstelugu.txt": "481c72a8f1b4f645a7e6b10326be41b2da2c15cb470ff48a07fab773eed00102",
    "LICENSE-material-symbols.txt": "58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd",
}


def cmap(path: Path) -> set[int]:
    with TTFont(path, lazy=True) as font:
        return set(font.getBestCmap() or {})


def feature_tags(path: Path) -> list[str]:
    with TTFont(path, lazy=True) as font:
        tags: set[str] = set()
        for table_name in ("GSUB", "GPOS"):
            if table_name not in font:
                continue
            feature_list = font[table_name].table.FeatureList
            if feature_list is not None:
                tags.update(record.FeatureTag for record in feature_list.FeatureRecord)
        return sorted(tags)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def axes(path: Path) -> list[tuple[str, float, float, float]]:
    with TTFont(path, lazy=True) as font:
        if "fvar" not in font:
            return []
        return [
            (axis.axisTag, axis.minValue, axis.defaultValue, axis.maxValue)
            for axis in font["fvar"].axes
        ]


def rows(path: Path) -> list[tuple[str, str, str]]:
    found: list[tuple[str, str, str]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        match = ROW_RE.match(line)
        if match:
            found.append((match["key"], match["english"], match["telugu"]))
    return found


def runs(text: str, coverages: list[set[int]]) -> list[tuple[int, str]]:
    result: list[tuple[int, str]] = []
    for char in text:
        owner = next((index for index, coverage in enumerate(coverages) if ord(char) in coverage), None)
        if owner is None:
            raise ValueError(f"no declared font covers U+{ord(char):04X} {char!r} in {text!r}")
        if result and result[-1][0] == owner:
            result[-1] = (owner, result[-1][1] + char)
        else:
            result.append((owner, char))
    return result


@lru_cache(maxsize=None)
def shape(
    hb_shape: Path,
    font: Path,
    text: str,
    variations: str | None = None,
) -> list[dict[str, int]]:
    command = [
        str(hb_shape),
        "--output-format=json",
        "--no-glyph-names",
        str(font),
        text,
    ]
    if variations:
        command.append(f"--variations={variations}")
    completed = subprocess.run(command, check=True, capture_output=True, text=True)
    return json.loads(completed.stdout)


def decompress(source: Path, destination: Path) -> None:
    font = TTFont(source)
    font.flavor = None
    font.save(destination)
    font.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("copy", type=Path)
    parser.add_argument("upstream", type=Path)
    parser.add_argument("shipped", type=Path)
    default_hb_shape = shutil.which("hb-shape") or "/opt/homebrew/bin/hb-shape"
    parser.add_argument("--hb-shape", type=Path, default=Path(default_hb_shape))
    args = parser.parse_args()

    poppins_upstream = {
        400: args.upstream / "Poppins-Regular.ttf",
        600: args.upstream / "Poppins-SemiBold.ttf",
        700: args.upstream / "Poppins-Bold.ttf",
    }
    poppins_shipped = {
        weight: args.shipped / f"poppins-latin-{weight}.woff2" for weight in poppins_upstream
    }
    noto_upstream = args.upstream / "NotoSansTelugu[wdth,wght].ttf"
    noto_shipped = args.shipped / "noto-sans-telugu-400-700.woff2"

    source_hashes: dict[str, str] = {}
    hash_failures: list[str] = []
    for filename, expected in EXPECTED_SOURCE_SHA256.items():
        source = args.upstream / filename
        actual = sha256(source)
        source_hashes[filename] = actual
        if actual != expected:
            hash_failures.append(f"{filename}: expected {expected}, found {actual}")
    if hash_failures:
        raise SystemExit("upstream source pin mismatch:\n" + "\n".join(hash_failures))

    with tempfile.TemporaryDirectory(prefix="saaya-font-check-") as directory:
        temporary = Path(directory)
        decompressed_poppins: dict[int, Path] = {}
        for weight, source in poppins_shipped.items():
            output = temporary / f"poppins-{weight}.ttf"
            decompress(source, output)
            decompressed_poppins[weight] = output
        decompressed_noto = temporary / "noto.ttf"
        decompress(noto_shipped, decompressed_noto)

        coverages = [cmap(decompressed_poppins[400]), cmap(decompressed_noto)]
        run_counts: Counter[str] = Counter()
        failures: list[str] = []
        copy_rows = rows(args.copy)
        for key, english, telugu in copy_rows:
            for language, text in (("en", english), ("te", telugu)):
                for owner, run in runs(text, coverages):
                    family = "Poppins" if owner == 0 else "Noto Sans Telugu"
                    run_counts[family] += 1
                    for weight in (400, 600, 700):
                        if owner == 0:
                            expected = shape(args.hb_shape, poppins_upstream[weight], run)
                            actual = shape(args.hb_shape, decompressed_poppins[weight], run)
                        else:
                            expected = shape(
                                args.hb_shape,
                                noto_upstream,
                                run,
                                f"wdth=100,wght={weight}",
                            )
                            actual = shape(args.hb_shape, decompressed_noto, run, f"wght={weight}")
                        if expected != actual:
                            failures.append(
                                f"{key}/{language}/{family}/{weight}: {run!r}\n"
                                f"  upstream={expected}\n  shipped={actual}"
                            )

        repository_root = args.copy.resolve().parents[2]
        material = args.shipped / "material-symbols-subset.woff2"
        runtime_glyphs = json.loads(
            (repository_root / "src/ui/icons/materialSymbols.json").read_text()
        )
        required_icons = {
            name: ord(glyph) for name, glyph in runtime_glyphs.items()
        }
        material_cmap = cmap(material)
        missing_icons = [name for name, codepoint in required_icons.items() if codepoint not in material_cmap]
        if missing_icons:
            failures.append(f"Material Symbols missing: {', '.join(missing_icons)}")

        expected_noto_axes = [("wght", 400.0, 400.0, 700.0)]
        if axes(noto_shipped) != expected_noto_axes:
            failures.append(
                f"Noto Sans Telugu axes changed: expected {expected_noto_axes}, "
                f"found {axes(noto_shipped)}"
            )

        material_upstream = (
            args.upstream / "MaterialSymbolsRounded[FILL,GRAD,opsz,wght].ttf"
        )
        if axes(material) != axes(material_upstream):
            failures.append(
                "Material Symbols axes changed: "
                f"upstream={axes(material_upstream)}, shipped={axes(material)}"
            )

        required_licences = {
            "OFL-poppins.txt",
            "OFL-notosanstelugu.txt",
            "LICENSE-material-symbols.txt",
        }
        missing_licences = sorted(
            filename for filename in required_licences if not (args.shipped / filename).is_file()
        )
        if missing_licences:
            failures.append(f"missing shipped licences: {', '.join(missing_licences)}")

        spec_graph = json.loads((repository_root / "graph/spec_graph.json").read_text())
        budget_fact = next(fact for fact in spec_graph["facts"] if fact["id"] == "font.budget")
        budget_bytes = int(budget_fact["value"] * 1000)
        shipped_bytes = sum(path.stat().st_size for path in args.shipped.iterdir() if path.is_file())
        if shipped_bytes >= budget_bytes:
            failures.append(
                f"font directory is {shipped_bytes} bytes; must stay under {budget_bytes} bytes"
            )

        print("source_sha256=" + json.dumps(source_hashes, sort_keys=True))
        print(f"rows={len(copy_rows)}")
        print(f"runs={dict(run_counts)}")
        for weight, source in poppins_upstream.items():
            print(f"Poppins {weight} features={feature_tags(source)}")
        print(f"Noto Sans Telugu features={feature_tags(noto_upstream)}")
        print(f"Noto Sans Telugu shipped axes={axes(noto_shipped)}")
        print(f"Material Symbols shipped axes={axes(material)}")
        print(f"Material Symbols present={len(required_icons) - len(missing_icons)}/{len(required_icons)}")
        print(f"public/fonts bytes={shipped_bytes}; budget<{budget_bytes}")
        if failures:
            print("\n".join(failures[:20]))
            raise SystemExit(f"{len(failures)} shaping or glyph-presence failure(s)")
        print("result=PASS; every glyph id and advance matched at 400/600/700")


if __name__ == "__main__":
    main()
