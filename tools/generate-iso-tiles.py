#!/usr/bin/env python3
"""
tools/generate-iso-tiles.py

F2.5.2 asset pipeline driver (ASSET-001..ASSET-005, terrain-fidelity).

Responsibilities:
  1. Parse `assets/references/stage{1-5}-*/NOTES.md` to extract:
       - **Location:** string
       - bullets under "**Hábito vegetal real documentado:**"
       - bullets under "**Componentes típicos:**" / "**Edificios y patrimonio reconocible:**"
         / "**Características visuales distintivas:**" / "**Landmarks reconocibles para incluir en el bg:**"
       - **Color palette:** / **Color palette distinta a otros stages:** bullets
  2. Build 40 per-variant prompts using the design.md §7 template, injecting
     the NOTES.md content + per-variant note from `tools/variants.json`.
     Stage 4 (Vertedero) gets the VERTEDERO_NEGATIVE suffix.
  3. Orchestrate minimax MCP image generation (driven externally by the
     apply agent — the script writes a manifest the agent consumes).
  4. Run `tools/postprocess_v4.py` per stage to chroma-key magenta corners.
  5. Validate: 128x64 PNGs, no residual #FF00FF in corners after postprocess.

Modes:
  --dry-run           Print 40 prompts to stdout, no side effects.
  --emit-manifest     Write assets/tiles/manifest.json with one entry per
                      variant: stageId, variant, prompt, output path.
  --postprocess       Run postprocess_v4.py on every stage folder that
                      has a populated `raw/` subdir.
  --validate          Check 128x64 + magenta-free corners on processed PNGs.

Stdlib-only. Pillow used for PNG validation only (lazy-import; the rest
of the script is pure stdlib so --dry-run works without Pillow installed).
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ASSETS_ROOT = REPO_ROOT / "assets" / "tiles"
REFS_ROOT = REPO_ROOT / "assets" / "references"
VARIANTS_JSON = REPO_ROOT / "tools" / "variants.json"
POSTPROCESS_SCRIPT = REPO_ROOT / "tools" / "postprocess_v4.py"
TILE_W, TILE_H = 128, 64  # ASSET-001: 2:1 diamond dimensions

# Stage order MUST match SPEC ordering (used to keep manifest deterministic).
STAGES = [
    ("stage1-bosque",     "bosque"),
    ("stage2-pueblo",     "pueblo"),
    ("stage3-rio",        "rio"),
    ("stage4-vertedero",  "vertedero"),
    ("stage5-castillo",   "castillo"),
]

# design.md §7 — the canonical prompt skeleton.
PROMPT_TEMPLATE = """\
Isometric pixel art ground tile, 128x64 px diamond (2:1 ratio), flat magenta #FF00FF background, Diablo 2 ground tile style, 16-bit pixel art, no anti-aliasing, no characters, no items, no text, no UI, no borders, no watermarks.

LOCATION: {location}

DISTINCTIVE TERRAIN FEATURES (must reflect): {features_block}

COLOR PALETTE: {palette_block}

VARIANT-SPECIFIC NOTE: {variant_note}\
"""

# Stage 4 negative prompt — appended to every variant to enforce the
# anti-glorification gate (ASSET-005). Wording lifted from design.md §7.
VERTEDERO_NEGATIVE = (
    " no green vegetation, no blue sky, no natural beauty, "
    "oppressive grey-brown industrial palette, dirty and decayed feel, "
    "dump not resort, no aesthetic charm"
)

# Notes sections we pull bullets from, in priority order.
FEATURE_SECTION_RE = re.compile(
    r"\*\*(Hábito vegetal real documentado|Componentes típicos[^:]*:"
    r"|Edificios y patrimonio reconocible:|Características visuales distintivas:"
    r"|Landmarks[^:]*:|Datos reales [^:]*:|Elementos reconocibles para el bg:"
    r"|Color palette[^:]*:)\*\*\s*\n((?:\s*-\s+[^\n]+\n?)+)",
    re.MULTILINE,
)
LOCATION_RE = re.compile(r"\*\*Location:\*\*\s*([^\n]+)")
PALETTE_HEADER_RE = re.compile(
    r"\*\*Color palette[^:]*:\*\*\s*\n((?:\s*-\s+[^\n]+\n?)+)", re.MULTILINE
)


def parse_notes(stage_id: str) -> dict:
    """Parse the NOTES.md for a stage. Returns
    {location, features, palette}. Missing sections default to empty."""
    folder = REFS_ROOT / stage_id
    notes_path = folder / "NOTES.md"
    if not notes_path.exists():
        return {"location": "", "features": [], "palette": []}
    text = notes_path.read_text(encoding="utf-8")

    loc_match = LOCATION_RE.search(text)
    location = loc_match.group(1).strip() if loc_match else ""

    features = []
    for m in FEATURE_SECTION_RE.finditer(text):
        bullet_block = m.group(2)
        for line in bullet_block.splitlines():
            line = line.strip()
            if line.startswith("- "):
                features.append(line[2:].strip())

    palette = []
    pal_match = PALETTE_HEADER_RE.search(text)
    if pal_match:
        for line in pal_match.group(1).splitlines():
            line = line.strip()
            if line.startswith("- "):
                palette.append(line[2:].strip())

    return {"location": location, "features": features, "palette": palette}


def build_prompt(stage_id: str, variant: str, variant_note: str,
                 parsed: dict, refs: list[str]) -> str:
    features_block = "\n".join(f"  - {f}" for f in parsed["features"][:8]) \
        or "  - (none documented)"
    palette_block = "\n".join(f"  - {p}" for p in parsed["palette"][:8]) \
        or "  - (no palette documented; default to natural terrain)"

    refs_line = ""
    if refs:
        refs_line = "\n\nREFERENCE PHOTOS available: " + ", ".join(refs)

    base = PROMPT_TEMPLATE.format(
        location=parsed["location"] or stage_id,
        features_block=features_block,
        palette_block=palette_block,
        variant_note=variant_note,
    )
    base = base + refs_line
    if stage_id == "stage4-vertedero":
        base = base + "\n\nNEGATIVE CONSTRAINTS:" + VERTEDERO_NEGATIVE
    return base


def list_refs(stage_id: str) -> list[str]:
    folder = REFS_ROOT / stage_id
    if not folder.exists():
        return []
    return sorted(
        p.name for p in folder.iterdir()
        if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )


def load_variants() -> dict:
    return json.loads(VARIANTS_JSON.read_text(encoding="utf-8"))


def build_all_prompts() -> list[dict]:
    """Return list of dicts:
      [{stageId, stageName, variant, prompt, outputPath}, ...]
    Length MUST be 40 (5 stages × 8 variants) — checked at dry-run time.
    """
    variants_map = load_variants()
    out = []
    for stage_id, stage_name in STAGES:
        parsed = parse_notes(stage_id)
        refs = list_refs(stage_id)
        per_stage = variants_map.get(stage_id, {})
        if len(per_stage) != 8:
            print(
                f"WARN: {stage_id} has {len(per_stage)} variants in variants.json, "
                f"spec requires 8",
                file=sys.stderr,
            )
        for variant, note in per_stage.items():
            prompt = build_prompt(stage_id, variant, note, parsed, refs)
            out.append({
                "stageId": stage_id,
                "stageName": stage_name,
                "variant": variant,
                "prompt": prompt,
                "rawPath": str(
                    ASSETS_ROOT / stage_id / "raw" / f"{variant}.png"
                ),
                "outPath": str(
                    ASSETS_ROOT / stage_id / f"{variant}.png"
                ),
            })
    return out


def emit_manifest(entries: list[dict]) -> None:
    ASSETS_ROOT.mkdir(parents=True, exist_ok=True)
    manifest_path = ASSETS_ROOT / "manifest.json"
    manifest_path.write_text(
        json.dumps(entries, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"manifest written: {manifest_path} ({len(entries)} entries)")


def run_postprocess() -> int:
    """For every stage with a populated `raw/` folder, run postprocess_v4.py
    to produce chroma-keyed PNGs at the stage root, then crop the square
    output to 128x64 to match the iso diamond spec (ASSET-001)."""
    try:
        from PIL import Image
    except ImportError:
        print("Pillow not installed; cannot postprocess", file=sys.stderr)
        return 1
    if not POSTPROCESS_SCRIPT.exists():
        print(f"missing postprocess script: {POSTPROCESS_SCRIPT}", file=sys.stderr)
        return 1

    # postprocess_v4 outputs square; intermediate dir to host its 128x128
    # output before we crop to 128x64.
    tmp_root = ASSETS_ROOT / "_tmp_square"
    tmp_root.mkdir(parents=True, exist_ok=True)

    rc = 0
    for stage_id, _ in STAGES:
        stage_folder = ASSETS_ROOT / stage_id
        raw = stage_folder / "raw"
        if not raw.exists() or not any(raw.glob("*.png")):
            print(f"skip {stage_id} (no raw/*.png)")
            continue
        tmp_stage = tmp_root / stage_id
        tmp_stage.mkdir(exist_ok=True)
        cmd = [
            sys.executable,
            str(POSTPROCESS_SCRIPT),
            "--raw-dir", str(raw),
            "--out-dir", str(tmp_stage),
            "--size", "128",
        ]
        print(f"→ postprocess {stage_id}")
        result = subprocess.run(cmd)
        if result.returncode != 0:
            print(f"  FAIL {stage_id} (rc={result.returncode})", file=sys.stderr)
            rc = result.returncode
            continue
        # Crop each 128x128 PNG to 128x64 by finding the content bbox and
        # extracting the middle 64 rows. Pillow's NEAREST preserves pixel
        # sharpness; LANCZOS blurs edges.
        for src in sorted(tmp_stage.glob("*.png")):
            img = Image.open(src).convert("RGBA")
            content_rows = [y for y in range(img.height)
                            if any(img.getpixel((x, y))[3] > 16 for x in range(img.width))]
            if not content_rows:
                print(f"  WARN {src.name}: fully transparent after postprocess", file=sys.stderr)
                continue
            y_min, y_max = min(content_rows), max(content_rows)
            mid = (y_min + y_max) // 2
            y_start = max(0, mid - 32)
            y_end = min(img.height, y_start + 64)
            if y_end - y_start < 64:
                y_start = max(0, y_end - 64)
            cropped = img.crop((0, y_start, img.width, y_start + 64))
            cropped.save(stage_folder / src.name, "PNG", optimize=True)
        print(f"  {stage_id}: cropped {len(list(stage_folder.glob('*.png')))} tiles to 128x64")
    # Cleanup temp directory
    try:
        for stage in tmp_root.iterdir():
            for f in stage.iterdir():
                f.unlink()
            stage.rmdir()
        tmp_root.rmdir()
    except OSError:
        pass
    return rc


def validate_processed() -> int:
    """Check every processed PNG: 128x64 dimensions + no magenta corners.
    Uses Pillow (lazy-import)."""
    try:
        from PIL import Image
    except ImportError:
        print("Pillow not installed; skipping validation", file=sys.stderr)
        return 0
    failures = []
    processed_count = 0
    for stage_id, _ in STAGES:
        stage_folder = ASSETS_ROOT / stage_id
        if not stage_folder.exists():
            continue
        # Only direct children — exclude the `raw/` subdir.
        pngs = sorted(p for p in stage_folder.glob("*.png") if p.parent == stage_folder)
        if not pngs:
            continue
        for png in pngs:
            img = Image.open(png).convert("RGBA")
            if img.size != (TILE_W, TILE_H):
                failures.append(f"{png.name}: size {img.size} ≠ {TILE_W}x{TILE_H}")
                continue
            processed_count += 1
            # 4 corners should be transparent after postprocess.
            for label, (x, y) in [
                ("tl", (0, 0)),
                ("tr", (TILE_W - 1, 0)),
                ("bl", (0, TILE_H - 1)),
                ("br", (TILE_W - 1, TILE_H - 1)),
            ]:
                r, g, b, a = img.getpixel((x, y))
                if a > 16:
                    failures.append(f"{png.name} corner {label} alpha={a} (expected ~0)")
    if failures:
        print("VALIDATION FAILURES:", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        return 1
    print(f"OK — {processed_count} processed tiles pass shape + chroma-key gate")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--dry-run", action="store_true",
                   help="Print 40 prompts to stdout, no side effects.")
    g.add_argument("--emit-manifest", action="store_true",
                   help="Write assets/tiles/manifest.json and exit.")
    g.add_argument("--postprocess", action="store_true",
                   help="Run postprocess_v4.py on each stage's raw/ folder.")
    g.add_argument("--validate", action="store_true",
                   help="Validate 128x64 + transparent corners on processed PNGs.")
    args = ap.parse_args()

    if args.dry_run:
        entries = build_all_prompts()
        assert len(entries) == 40, f"expected 40 prompts, got {len(entries)}"
        for i, e in enumerate(entries, 1):
            print(f"--- [{i:02d}/40] {e['stageId']}/{e['variant']} ---")
            print(e["prompt"])
            print()
        print(f"# total: {len(entries)} prompts", file=sys.stderr)
        return 0

    if args.emit_manifest:
        entries = build_all_prompts()
        emit_manifest(entries)
        return 0

    if args.postprocess:
        return run_postprocess()

    if args.validate:
        return validate_processed()

    return 0


if __name__ == "__main__":
    sys.exit(main())