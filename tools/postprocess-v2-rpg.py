#!/usr/bin/env python3
"""
postprocess-v2-rpg.py — upscale Diablo 2 RPG wilderness backgrounds.

Pipeline:
  1. Read each stage's picked variant JPEG from assets/backgrounds/v2-rpg/.
  2. Upscale 2x with NEAREST (preserves and reinforces pixel-art chunkiness).
  3. Save as PNG to assets/backgrounds/stage{N}-{name}.png (replacing previous).

The 2x NEAREST upscale doubles every native pixel — 1344x576 → 2688x1152,
which is much larger than the previous 640x1120 portrait backgrounds.
The chunky pixel-art look is amplified, not smoothed.

Final output:
  assets/backgrounds/stage1-bosque.png     2688 x 1152
  assets/backgrounds/stage2-pueblo.png     2688 x 1152
  assets/backgrounds/stage3-rio.png        2688 x 1152
  assets/backgrounds/stage4-vertedero.png  2688 x 1152
  assets/backgrounds/stage5-castillo.png    2688 x 1152
"""

import shutil
import sys
from pathlib import Path

from PIL import Image

SRC_DIR = Path("assets/backgrounds/v2-rpg")
DST_DIR = Path("assets/backgrounds")

# Curated picks per stage: (variant_filename, final_name).
# Picked by visual review — see /scratch/session-transcript for reasoning.
PICKS = [
    ("stage1-bosque-v4.jpeg", "stage1-bosque.png"),
    ("stage2-pueblo-v3.jpeg", "stage2-pueblo.png"),
    ("stage3-rio-v2.jpeg",    "stage3-rio.png"),
    ("stage4-vertedero-v1.jpeg", "stage4-vertedero.png"),
    ("stage5-castillo-v2.jpeg",  "stage5-castillo.png"),
]

UPSCALE_FACTOR = 2


def upscale_chunky(src: Path, dst: Path) -> tuple[int, int]:
    img = Image.open(src).convert("RGB")
    w, h = img.size
    new_size = (w * UPSCALE_FACTOR, h * UPSCALE_FACTOR)
    upscaled = img.resize(new_size, Image.NEAREST)
    upscaled.save(dst, "PNG", optimize=True)
    return new_size


def main() -> int:
    DST_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Source: {SRC_DIR.resolve()}")
    print(f"Target: {DST_DIR.resolve()}")
    print(f"Upscale factor: {UPSCALE_FACTOR}x NEAREST (pixel-art amplification)")
    print("-" * 60)

    for src_name, dst_name in PICKS:
        src = SRC_DIR / src_name
        dst = DST_DIR / dst_name
        if not src.exists():
            print(f"FAIL  {src_name} — not found")
            return 1
        size = upscale_chunky(src, dst)
        kb = dst.stat().st_size // 1024
        print(f"OK    {src_name:30s} -> {dst_name:25s}  {size[0]}x{size[1]}  ({kb} KB)")

    print("-" * 60)
    print("Done. Update BackgroundLayer constants if aspect ratio changed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
