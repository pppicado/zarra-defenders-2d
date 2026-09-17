#!/usr/bin/env python3
"""
build-catalogoraw.py — emit catalogoraw-data.json enumerating ALL raw (unprocessed)
graphics generated across every iteration directory.

Covers:
  v2-rpg/                  (20 files)  — first RPG iteration (subtle modular)
  v3-rpg-isometric/        (11 files)  — isometric top-down (clean modular)
  v4-journey/              (28 files)  — journey-focused (3-strip composite)
  v5-tiles/                (32 files)  — STRONG tile-based prompts (Diablo 2)
  long-bg/                 (105 files) — segmented long-panoramic strips

Output: assets/backgrounds/catalogoraw-data.json
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BG_DIR = ROOT / "assets" / "backgrounds"
OUT = BG_DIR / "catalogoraw-data.json"

# All iteration directories with their iteration label + path
GROUPS = [
    ("v2-rpg",            "v2 — first RPG (subtle modular, raster paintings)"),
    ("v3-rpg-isometric",  "v3 — isometric top-down (clean modular)"),
    ("v4-journey",        "v4 — journey-focused (3-segment prompt, no FAR yet)"),
    ("v5-tiles",          "v5 — STRONG tile-based (Diablo 2 wilderness grid + sprites)"),
    ("long-bg",           "long-bg — segmented panoramic (3 segs × 4-5 variants × 5 stages)"),
]


def collect_files() -> dict:
    """Walk each group and produce {group: [file_metadata, ...]}."""
    result = {}
    for group_name, group_label in GROUPS:
        group_dir = BG_DIR / group_name
        if not group_dir.exists():
            result[group_name] = {"label": group_label, "files": []}
            continue
        files = []
        for f in sorted(group_dir.iterdir()):
            if f.is_file() and f.suffix.lower() in (".jpeg", ".jpg", ".png"):
                stat = f.stat()
                files.append({
                    "name": f.name,
                    "path": f"{group_name}/{f.name}",
                    "size_kb": round(stat.st_size / 1024, 1),
                    "modified": __import__("datetime").datetime.fromtimestamp(stat.st_mtime).isoformat()[:19],
                })
        result[group_name] = {
            "label": group_label,
            "files": files,
            "count": len(files),
        }
    return result


def main() -> int:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "generated_at": __import__("datetime").datetime.now().isoformat(),
        "groups": collect_files(),
    }
    total_files = sum(g["count"] for g in data["groups"].values())
    total_kb = sum(f["size_kb"] for g in data["groups"].values() for f in g["files"])
    data["totals"] = {
        "files": total_files,
        "size_mb": round(total_kb / 1024, 2),
    }
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    size = OUT.stat().st_size // 1024
    print(f"OK  {OUT}  ({size} KB)")
    print(f"    {total_files} files · {data['totals']['size_mb']} MB total")
    for group_name, group_data in data["groups"].items():
        print(f"    · {group_name:25s} {group_data['count']:3d} files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
