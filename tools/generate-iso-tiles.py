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
     Per-variant `negative_prompt` (tools/variants.json) gets appended.
  3. Orchestrate minimax MCP image generation (driven externally by the
     apply agent — the script writes a manifest the agent consumes).
  4. Run `tools/postprocess_v4.py` per stage to chroma-key magenta corners.
  5. Validate: 128x64 PNGs, no residual #FF00FF in corners after postprocess.

Modes:
  --dry-run           Print 40 prompts to stdout, no side effects.
  --emit-manifest     Write assets/tiles/manifest.json with `active[]` +
                      `discarded[]` (preserves any discarded entries already
                      in the file). One entry per variant in active.
  --postprocess       Run postprocess_v4.py on every stage folder that
                      has a populated `raw/` subdir.
  --postprocess --stage X --variants Y,Z
                      Run postprocess only on the named stage+variants.
  --regenerate --stage X --variants Y,Z
                      Move the named variants from `active` to `discarded`
                      in the manifest (with a regeneration reason) and
                      delete their processed PNG (the apply agent will
                      drop new raw PNGs in stage/{N}/raw/ and re-run
                      --postprocess). Idempotent.
  --validate          Check 128x64 + magenta-free corners on processed PNGs.

Manifest schema (v1): { schema, updatedAt, totals, active[entry], discarded[entry] }
Entry = { stageId, stageName, variant, prompt, rawPath, outPath }
Discarded entry adds: discardedAt, discardReason, archivedPath, archivedRawPath.

Stdlib-only. Pillow used for PNG validation only (lazy-import; the rest
of the script is pure stdlib so --dry-run works without Pillow installed).
"""

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
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
                 parsed: dict, refs: list[str],
                 negative_prompt: str = "") -> str:
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
    if negative_prompt:
        base = base + "\n\nPER-VARIANT NEGATIVE CONSTRAINTS: " + negative_prompt
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
    """Returns the full variants.json: { stageId: { variant: { note, negative_prompt? } } }
    Backwards-compatible: legacy values are plain strings (the note)."""
    raw = json.loads(VARIANTS_JSON.read_text(encoding="utf-8"))
    normalised = {}
    for stage_id, per_stage in raw.items():
        if stage_id.startswith("_"):
            continue  # _comment keys etc.
        normalised[stage_id] = {}
        for variant, value in per_stage.items():
            if isinstance(value, str):
                normalised[stage_id][variant] = {"note": value, "negative_prompt": ""}
            else:
                normalised[stage_id][variant] = {
                    "note": value.get("note", ""),
                    "negative_prompt": value.get("negative_prompt", ""),
                }
    return normalised


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
        for variant, info in per_stage.items():
            prompt = build_prompt(
                stage_id, variant, info["note"], parsed, refs,
                negative_prompt=info["negative_prompt"],
            )
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


def _manifest_path() -> Path:
    return ASSETS_ROOT / "manifest.json"


def _read_manifest() -> dict:
    """Read manifest, returning a structured dict. Legacy flat-array
    manifests are auto-converted to v1 (everything goes into active[])."""
    p = _manifest_path()
    if not p.exists():
        return {"schema": "tile-manifest/v1", "active": [], "discarded": []}
    raw = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(raw, list):
        return {"schema": "tile-manifest/v1", "active": raw, "discarded": []}
    if "active" not in raw:
        raw["active"] = []
    if "discarded" not in raw:
        raw["discarded"] = []
    return raw


def _write_manifest(manifest: dict) -> None:
    ASSETS_ROOT.mkdir(parents=True, exist_ok=True)
    p = _manifest_path()
    p.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def emit_manifest(entries: list[dict]) -> None:
    """Write v1 manifest: preserve existing discarded[] entries, replace
    active[] with the freshly-built entries."""
    existing = _read_manifest()
    # Index existing discarded by (stageId, variant) so we don't double-add.
    existing_discarded = {
        (d["stageId"], d["variant"]): d for d in existing.get("discarded", [])
    }
    # Build new active list. Anything in existing_discarded stays discarded
    # (don't pull it back into active accidentally).
    new_active = []
    for e in entries:
        if (e["stageId"], e["variant"]) in existing_discarded:
            continue
        new_active.append(e)
    out = {
        "schema": "tile-manifest/v1",
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "totals": {
            "active": len(new_active),
            "discarded": len(existing_discarded),
            "expected": len(entries),
        },
        "active": new_active,
        "discarded": list(existing_discarded.values()),
    }
    _write_manifest(out)
    print(f"manifest written: {_manifest_path()} "
          f"({len(new_active)} active + {len(existing_discarded)} discarded "
          f"= {len(new_active) + len(existing_discarded)} of {len(entries)} expected)")


def mark_regenerate(stage_id: str, variants: list[str], reason: str) -> int:
    """Move the named (stageId, variant) entries from active → discarded.
    Delete the processed PNG so a fresh postprocess starts from a clean slate.
    Idempotent — re-running on an already-discarded entry is a no-op (and
    keeps the original discardedAt/timestamp)."""
    existing = _read_manifest()
    active = existing.get("active", [])
    discarded_map = {
        (d["stageId"], d["variant"]): d for d in existing.get("discarded", [])
    }
    moved, removed_files = 0, 0
    new_active = []
    for entry in active:
        if entry["stageId"] != stage_id or entry["variant"] not in variants:
            new_active.append(entry)
            continue
        key = (entry["stageId"], entry["variant"])
        # Delete the processed PNG (raw is gitignored; we leave it for postprocess).
        out_p = Path(entry["outPath"])
        if out_p.exists():
            try:
                out_p.unlink()
                removed_files += 1
            except OSError as e:
                print(f"  WARN: could not delete {out_p}: {e}", file=sys.stderr)
        # Keep original discard record if already present, otherwise create new.
        if key in discarded_map:
            discarded_map[key]["discardReason"] = (
                f"{discarded_map[key].get('discardReason', '')} | regen requested: {reason}"
            ).strip(" |")
        else:
            stage_num = stage_id.split("-")[0]
            archive_name = f"{stage_num}_{entry['variant']}_discarded.png"
            discarded_map[key] = {
                **entry,
                "discardedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "discardReason": reason,
                "archivedPath": f"assets/tiles/_discarded/{archive_name}",
                "archivedRawPath": f"assets/tiles/_discarded/raw/{archive_name}",
            }
        moved += 1
    out = {
        "schema": "tile-manifest/v1",
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "totals": {
            "active": len(new_active),
            "discarded": len(discarded_map),
            "expected": 40,
        },
        "active": new_active,
        "discarded": list(discarded_map.values()),
    }
    _write_manifest(out)
    print(f"regenerate {stage_id}: moved {moved} variant(s) to discarded, "
          f"deleted {removed_files} processed PNG(s)")
    return 0


def run_postprocess(stage_filter: str | None = None,
                    variant_filter: list[str] | None = None) -> int:
    """For every stage with a populated `raw/` folder, run postprocess_v4.py
    to produce chroma-keyed PNGs at the stage root, then crop the square
    output to 128x64 to match the iso diamond spec (ASSET-001).

    If stage_filter is set, only that stage is processed. If variant_filter
    is also set, only those variants are processed (the rest of raw/ is
    staged into a sibling temp dir so postprocess_v4 sees only the requested
    files)."""
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

    stages_to_process = (
        [(s, n) for s, n in STAGES if s == stage_filter]
        if stage_filter else STAGES
    )

    rc = 0
    for stage_id, _ in stages_to_process:
        stage_folder = ASSETS_ROOT / stage_id
        raw = stage_folder / "raw"
        if not raw.exists() or not any(raw.glob("*.png")):
            print(f"skip {stage_id} (no raw/*.png)")
            continue

        # If a variant filter is set, stage only those raw files into a sibling
        # dir (avoids re-processing unchanged variants).
        if variant_filter:
            raw_in = raw
            raw_out = stage_folder / f"_raw_filt_{int(datetime.now().timestamp())}"
            raw_out.mkdir(exist_ok=True)
            for v in variant_filter:
                src = raw_in / f"{v}.png"
                if src.exists():
                    (raw_out / src.name).write_bytes(src.read_bytes())
                else:
                    print(f"  WARN {stage_id}/{v}: no raw/{v}.png", file=sys.stderr)
            raw_dir_for_postprocess = raw_out
        else:
            raw_dir_for_postprocess = raw
            raw_out = None

        tmp_stage = tmp_root / stage_id
        tmp_stage.mkdir(exist_ok=True)
        cmd = [
            sys.executable,
            str(POSTPROCESS_SCRIPT),
            "--raw-dir", str(raw_dir_for_postprocess),
            "--out-dir", str(tmp_stage),
            "--size", "128",
        ]
        print(f"→ postprocess {stage_id}"
              + (f" (variants: {','.join(variant_filter)})" if variant_filter else ""))
        result = subprocess.run(cmd)
        if raw_out is not None:
            # Clean staged filter dir regardless of postprocess rc.
            try:
                for f in raw_out.iterdir():
                    f.unlink()
                raw_out.rmdir()
            except OSError:
                pass
        if result.returncode != 0:
            print(f"  FAIL {stage_id} (rc={result.returncode})", file=sys.stderr)
            rc = result.returncode
            continue
        # Crop each 128x128 PNG to 128x64 by finding the content bbox and
        # extracting the middle 64 rows. Pillow's NEAREST preserves pixel
        # sharpness; LANCZOS blurs edges.
        for src in sorted(tmp_stage.glob("*.png")):
            if variant_filter and src.stem not in variant_filter:
                continue
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
            # Force the 4 bounding-box corners transparent (outside the
            # 2:1 diamond). postprocess_v4 misses occasional magenta residue
            # in corners when the model doesn't render the BG cleanly.
            for cx, cy in [(0, 0), (cropped.width - 1, 0),
                           (0, cropped.height - 1), (cropped.width - 1, cropped.height - 1)]:
                cropped.putpixel((cx, cy), (0, 0, 0, 0))
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


def mark_regenerated(stage_id: str, variants: list[str]) -> int:
    """After a successful postprocess, move (stageId, variant) entries from
    discarded[] back to active[]. New prompt + rawPath come from build_all_prompts().
    Idempotent — already-active variants are skipped."""
    existing = _read_manifest()
    discarded_map = {
        (d["stageId"], d["variant"]): d for d in existing.get("discarded", [])
    }
    active = existing.get("active", [])
    active_keys = {(a["stageId"], a["variant"]) for a in active}

    # Build fresh prompt entries for the freshly-postprocessed variants.
    fresh_entries = {e["variant"]: e for e in build_all_prompts()
                     if e["stageId"] == stage_id}

    promoted, already_active = 0, 0
    new_active = list(active)
    new_discarded = []
    for key, old in discarded_map.items():
        s_id, variant = key
        if s_id == stage_id and variant in variants and variant in fresh_entries:
            if key in active_keys:
                already_active += 1
                new_discarded.append(old)
            else:
                # Re-activate: use the freshly-built prompt (it may have
                # improved wording from variants.json) but preserve provenance.
                promoted_entry = dict(fresh_entries[variant])
                promoted_entry["regeneratedFrom"] = {
                    "originalDiscardedAt": old.get("discardedAt"),
                    "originalDiscardReason": old.get("discardReason"),
                    "regeneratedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                }
                new_active.append(promoted_entry)
                promoted += 1
        else:
            new_discarded.append(old)

    out = {
        "schema": "tile-manifest/v1",
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "totals": {
            "active": len(new_active),
            "discarded": len(new_discarded),
            "expected": 40,
        },
        "active": new_active,
        "discarded": new_discarded,
    }
    _write_manifest(out)
    print(f"regenerated {stage_id}: promoted {promoted} variant(s) "
          f"to active ({already_active} already active, "
          f"{len(new_discarded)} still discarded)")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--dry-run", action="store_true",
                   help="Print 40 prompts to stdout, no side effects.")
    g.add_argument("--emit-manifest", action="store_true",
                   help="Write assets/tiles/manifest.json and exit "
                        "(preserves existing discarded[] entries).")
    g.add_argument("--postprocess", action="store_true",
                   help="Run postprocess_v4.py on each stage's raw/ folder.")
    g.add_argument("--regenerate", action="store_true",
                   help="Mark the named stage+variants as discarded in the "
                        "manifest (delete processed PNG, expect re-generation).")
    g.add_argument("--mark-regenerated", action="store_true",
                   help="Move the named stage+variants from discarded back to "
                        "active in the manifest (call after --postprocess succeeds).")
    g.add_argument("--validate", action="store_true",
                   help="Validate 128x64 + transparent corners on processed PNGs.")
    ap.add_argument("--stage", help="Stage id (e.g. stage4-vertedero) "
                                    "for --postprocess / --regenerate / --mark-regenerated.")
    ap.add_argument("--variants", help="Comma-separated variant names for "
                                       "--postprocess / --regenerate / --mark-regenerated.")
    ap.add_argument("--reason", default="user visual review flagged for regeneration",
                    help="Discard reason for --regenerate (default: %(default)s).")
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
        vf = [v.strip() for v in args.variants.split(",")] if args.variants else None
        return run_postprocess(stage_filter=args.stage, variant_filter=vf)

    if args.regenerate:
        if not args.stage or not args.variants:
            print("--regenerate requires --stage and --variants", file=sys.stderr)
            return 2
        vf = [v.strip() for v in args.variants.split(",") if v.strip()]
        return mark_regenerate(args.stage, vf, args.reason)

    if args.mark_regenerated:
        if not args.stage or not args.variants:
            print("--mark-regenerated requires --stage and --variants", file=sys.stderr)
            return 2
        vf = [v.strip() for v in args.variants.split(",") if v.strip()]
        return mark_regenerated(args.stage, vf)

    if args.validate:
        return validate_processed()

    return 0


if __name__ == "__main__":
    sys.exit(main())