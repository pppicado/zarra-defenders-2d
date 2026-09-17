#!/usr/bin/env python3
"""
postprocess-v4-journey.py — pixel-art enforcement on v4 journey + v5 tiles RPG backgrounds.

Pipeline (configurable per stage):
  1. Quantize palette to N colors (preserves theme colors, removes smooth gradients).
  2. Downsample K× with LANCZOS to a low-res "pixel grid" target.
  3. Upscale K× back with NEAREST to the original size — preserves crisp pixel grid.
  4. Final 2× NEAREST upscale to 2688×1152 ("lo más grandes posibles").

Saves TWO copies of every output:
  • assets/backgrounds/stage{N}-{name}.png         — current definitive (overwritten)
  • assets/backgrounds/v4-journey-processed/s{N}-{variant}@pc{N}ds{K}.png — versioned archive

Versioned filename format: s{N}-{variant_label}@pc{PALETTE}ds{DOWNSAMPLE}.png

Two iteration rounds are supported:
  v4-journey/*  → current picks (4× downsample, Stage 2 2×)
  v5-tiles/*     → new tile-based iteration (SNES era Diablo 2 modular tiles)
"""

import argparse
import sys
from pathlib import Path

from PIL import Image

V4_DIR = Path("assets/backgrounds/v4-journey")
V5_DIR = Path("assets/backgrounds/v5-tiles")
DST_DIR = Path("assets/backgrounds")
ARCHIVE_DIR = V4_DIR.parent / "v4-journey-processed"

PALETTE_COLORS = 32
DOWNSAMPLE_FACTOR = 4   # default 4× for chunky pixel art
FINAL_UPSCALE = 2

# Per-stage overrides: La Hoz (Stage 2) keeps 2× downsample to preserve
# detail (footbridge, leachate pipe, rock walls). 4× was too aggressive.
DOWNSAMPLE_OVERRIDES = {
    2: 2,   # stage2-lahoz uses 2× downsample
}

# Iteration rounds + their picks (3D-aligned: Valle de Ayora real toponymy)
# 1 Las Hoyas de Caballero (Zarra), 2 La Hoz del rio Zarra, 3 Sierra de La Hunde y Palomera,
# 4 Casco urbano Ayora, 5 El Acuifero de la Mancha Oriental (jefe final)
ROUNDS = {
    "v4-journey": (V4_DIR, [
        ("s1-v3.jpeg",      "stage1-lashoyas.png"),
        ("s2-far-v1.jpeg",  "stage2-lahoz.png"),
        ("s3-v1.jpeg",      "stage3-lahunde.png"),
        ("s4-v1.jpeg",      "stage4-ayora.png"),
        ("s5-v2.jpeg",      "stage5-acuifero.png"),
    ]),
    "v5-tiles": (V5_DIR, [
        ("s1-tiles-v5.jpeg",  "stage1-lashoyas.png"),   # Las Hoyas - checkerboard tile grid + encinas/almendros sprites + TRECO silhouette
        ("s2-tiles-v6.jpeg",  "stage2-lahoz.png"),      # La Hoz - stone wall tiles + water tiles + cobblestone path + footbridge sprite + leachate pipe
        ("s3-tiles-v6.jpeg",  "stage3-lahunde.png"),    # La Hunde - tile modules pinocha+grass + romero/aliaga sprites + pine tree sprites + winding path
        ("s4-tiles-v1.jpeg",  "stage4-ayora.png"),      # Ayora casco - cobblestone plaza tiles + white houses + fountain + olive groves
        ("s5-tiles-v3.jpeg",  "stage5-acuifero.png"),   # Acuifero - stone floor tiles + stalactites + blue water + TRECO boss
    ]),
}

# Default round to use
DEFAULT_ROUND = "v5-tiles"   # tile-based iteration is now the definitive


def enforce_pixel_grid(src: Path, dst: Path, downsample_factor: int = DOWNSAMPLE_FACTOR) -> tuple[int, int]:
    img = Image.open(src).convert("RGB")
    quantized = img.quantize(colors=PALETTE_COLORS, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    w, h = quantized.size
    target = (max(1, w // downsample_factor), max(1, h // downsample_factor))
    lowres = quantized.resize(target, Image.LANCZOS)
    chunky = lowres.resize((w, h), Image.NEAREST)
    final_size = (w * FINAL_UPSCALE, h * FINAL_UPSCALE)
    final = chunky.resize(final_size, Image.NEAREST)
    final.save(dst, "PNG", optimize=True)
    return final_size


def versioned_name(src_name: str, palette: int, ds: int) -> str:
    """Build versioned archive filename: s2-tiles-v1@pc32ds4.png"""
    base = src_name.replace(".jpeg", "")
    return f"{base}@pc{palette}ds{ds}.png"


def process_all_variants(round_name: str = "v5-tiles") -> int:
    """Process every variant in the given round for catalog display."""
    src_dir, _ = ROUNDS[round_name]
    archive_dir = src_dir.parent / f"{src_dir.name}-processed"
    archive_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    for stage_num in [1, 2, 3, 4, 5]:
        ds = DOWNSAMPLE_OVERRIDES.get(stage_num, DOWNSAMPLE_FACTOR)
        for src_path in sorted(src_dir.glob(f"s{stage_num}*.jpeg")):
            archive_name = versioned_name(src_path.name, PALETTE_COLORS, ds)
            archive_path = archive_dir / archive_name
            if archive_path.exists():
                print(f"SKIP  {src_path.name:30s} -> {archive_name}  (already exists)")
                continue
            size = enforce_pixel_grid(src_path, archive_path, downsample_factor=ds)
            kb = archive_path.stat().st_size // 1024
            print(f"OK    {src_path.name:30s} -> {archive_name:35s}  {size[0]}x{size[1]}  ({kb} KB)  [ds={ds}x]")
            count += 1
    return count


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--round", default=DEFAULT_ROUND, choices=list(ROUNDS.keys()),
                    help=f"Iteration round (default: {DEFAULT_ROUND})")
    ap.add_argument("--all", action="store_true",
                    help="Process every variant in the round (not just picks) for catalog display")
    args = ap.parse_args()

    src_dir, picks = ROUNDS[args.round]
    archive_dir = src_dir.parent / f"{src_dir.name}-processed"
    DST_DIR.mkdir(parents=True, exist_ok=True)
    archive_dir.mkdir(parents=True, exist_ok=True)
    print(f"Source:   {src_dir.resolve()}")
    print(f"Target:   {DST_DIR.resolve()}/stage{{N}}-*.png  (current definitive, overwritten)")
    print(f"Archive:  {archive_dir.resolve()}/{{variant}}@pc{{P}}ds{{K}}.png  (versioned, kept)")
    print(f"Pipeline: quantize {PALETTE_COLORS} → downsample {DOWNSAMPLE_FACTOR}x → NEAREST upscale {FINAL_UPSCALE}x")
    print("-" * 80)

    for src_name, dst_name in picks:
        src = src_dir / src_name
        dst = DST_DIR / dst_name
        if not src.exists():
            print(f"FAIL  {src_name} — not found")
            return 1
        # Per-stage downsample override
        stage_num = int(dst_name[5])
        ds = DOWNSAMPLE_OVERRIDES.get(stage_num, DOWNSAMPLE_FACTOR)
        # Save definitive
        size = enforce_pixel_grid(src, dst, downsample_factor=ds)
        kb = dst.stat().st_size // 1024
        print(f"DEF    {src_name:25s} -> {dst_name:25s}  {size[0]}x{size[1]}  ({kb} KB)  [ds={ds}x]")
        # Save versioned archive
        archive_name = versioned_name(src_name, PALETTE_COLORS, ds)
        archive_path = archive_dir / archive_name
        size2 = enforce_pixel_grid(src, archive_path, downsample_factor=ds)
        kb2 = archive_path.stat().st_size // 1024
        print(f"ARCH   {src_name:25s} -> {archive_name:35s}  {size2[0]}x{size2[1]}  ({kb2} KB)  [ds={ds}x]")

    if args.all:
        print("-" * 80)
        print(f"ALL variants mode for {args.round}:")
        n = process_all_variants(args.round)
        print(f"Processed {n} new variants")

    print("-" * 80)
    return 0


if __name__ == "__main__":
    sys.exit(main())
